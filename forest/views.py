import re
import ujson
import requests

from django.shortcuts import render
from django.http import JsonResponse, HttpResponseNotFound, HttpResponseNotAllowed, HttpResponseForbidden
from django.contrib.auth import logout, authenticate, login
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.conf import settings

from django_registration.backends.activation.views import RegistrationView
from social_django.models import UserSocialAuth

from .models import Node, Relation, UserRelation, Subscription, Notification

from slugify import slugify


def make_safe(s):
    return re.sub('<\/?[^>]+(>|$)', '', s)


def uniqueify(model, slug):
    uniqueifier = 0
    new_slug = slug

    while True:

        if uniqueifier != 0:
            new_slug = slug + '-' + str(uniqueifier)

        nqs = model.objects.filter(slug=new_slug)
        if len(nqs) == 0:
            break

        uniqueifier += 1

    return new_slug


def xhr_delete_relation(request, slug):

    if request.method == 'DELETE':
        rqs = Relation.objects.filter(slug=slug)
        if len(rqs) == 0:
            return HttpResponseNotFound('No such relation')

        if not request.user == rqs[0].author:
            return HttpResponseForbidden('This relation does not belong to you')

        rqs[0].delete()

    return JsonResponse({}, safe=False)


def xhr_create_relation(request):

    if not request.method == 'POST':
        return HttpResponseNotAllowed('POST only on this endpoint')

    if not request.user.is_active:
        return HttpResponseForbidden('You are not logged in')

    doc = ujson.loads(request.body)

    # resolve parent node
    nqs = Node.objects.filter(slug=doc['parent'])
    if len(nqs) == 0:
        return HttpResponseNotFound('No such parent')

    parent = nqs[0]

    if 'child' in doc:
        # if client specified a child slug it MUST be found or we fail
        nqs = Node.objects.filter(slug=doc['child'])
        if len(nqs) == 0:
            return HttpResponseNotFound('No such child')

        child = nqs[0]

    else:
        # if client did NOT specify a child slug we generate one
        # which MUST be unique, if we collide we try again

        child = Node.objects.create(
            author=request.user,
            name=make_safe(doc['text']),
            slug=uniqueify(Node, make_safe(slugify(doc['text']))))

        Subscription.objects.create(
            user=request.user,
            node=child)

    relation = Relation.objects.create(
        author=request.user,
        slug=uniqueify(Relation, make_safe(slugify(doc['text']))),
        parent=parent,
        child=child,
        text=make_safe(doc['text']))

    for subscription in parent.subscription_set.all():
        Notification.objects.create(
            user=subscription.user,
            subscription=subscription,
            actor=request.user,
            node=parent,
            relation=relation,
            action=Notification.ACTION_CREATE)

    return JsonResponse(
        relation.make_json_response_dict(),
        safe=False)


def xhr_node_by_forward_relation_slug(request, slug):
    return xhr_node_by_relation_slug(request, slug, 'forward')


def xhr_node_by_backward_relation_slug(request, slug):
    return xhr_node_by_relation_slug(request, slug, 'backward')


def xhr_node_by_relation_slug(request, slug, direction):

    if request.user.is_active:
        r = Relation.objects.get(slug=slug)
        UserRelation.handle_user_action(request.user, r)
        if direction == 'forward':
            nqs = Node.objects.filter(inbound_relations=r)
        else:
            nqs = Node.objects.filter(outbound_relations=r)

    else:
        if direction == 'forward':
            nqs = Node.objects.filter(inbound_relations__slug=slug)
        else:
            nqs = Node.objects.filter(outbound_relations__slug=slug)

    if nqs is None or len(nqs) == 0:
        return HttpResponseNotFound('No such node')

    node = nqs[0]

    return JsonResponse(node.make_json_response_dict(request.user), safe=False)


def xhr_node_by_slug(request, slug):

    if len(slug) and slug[0] == '~':

        try:
            user = User.objects.get(username=slug[1:])
        except User.DoesNotExist as e:
            return HttpResponseNotFound('No such user')

        node, created = Node.objects.get_or_create(slug=slug, author=user)

        if created:
            node.name = ('User: ' + user.username)
            node.text = 'This is the user page for '+user.username
            node.save()

            Subscription.objects.create(user=user, node=node)

        if request.method == 'POST' or request.method == 'PUT':
            doc = ujson.loads(request.body)

            if node.author != request.user:
                return HttpResponseForbidden('This node does not belong to you')

            node.text = make_safe(doc['text'])
            node.save()

            for subscription in node.subscription_set.all():
                Notification.objects.create(
                    user=subscription.user,
                    subscription=subscription,
                    actor=request.user,
                    node=node,
                    action=Notification.ACTION_MODIFY)

        elif request.method == 'DELETE':
            return HttpResponseForbidden('User pages cannot be deleted.')

    else:

        nqs = Node.objects.filter(slug=slug)
        if nqs is None or len(nqs) == 0:

            # special handling for user pages
            return HttpResponseNotFound('No such node')

        node = nqs[0]

        if request.method == 'POST' or request.method == 'PUT':
            doc = ujson.loads(request.body)

            if node.author != request.user:
                return HttpResponseForbidden('This node does not belong to you')

            node.name = make_safe(doc['name'])
            node.slug = slugify(doc['name'])
            node.text = make_safe(doc['text'])
            node.save()

            for subscription in node.subscription_set.all():
                Notification.objects.create(
                    user=subscription.user,
                    subscription=subscription,
                    actor=request.user,
                    node=node,
                    action=(Notification.ACTION_CREATE if request.method == 'POST' else Notification.ACTION_MODIFY))

        elif request.method == 'DELETE':

            if node.author != request.user:
                return HttpResponseForbidden('This node does not belong to you')

            node.delete()

    rdict = node.make_json_response_dict(request.user)

    return JsonResponse(rdict, safe=False)


def xhr_unsubscribe(request, slug):
    return xhr_subscribe(request, slug, False)


def xhr_subscribe(request, slug, subscribe=True):

    nqs = Node.objects.filter(slug=slug)
    if nqs is None or len(nqs) == 0:
        return HttpResponseNotFound('No such node')

    node = nqs[0]

    filters = {
        'node': node,
        'user': request.user
    }

    if subscribe:
        sub, created = Subscription.objects.get_or_create(**filters)
    else:
        Subscription.objects.filter(**filters).delete()

    return JsonResponse({}, safe=False)


def xhr_relations_for_parent_node(request, slug):
    return JsonResponse(
        [r.make_json_response_dict()
         for r in Relation.objects.filter(parent__slug=slug).order_by('-created')],
        safe=False)


def xhr_relations(request, slug, text=None):

    # unpack sorting prefs
    sortdir = request.GET.get('sortdir')
    sort = request.GET.get('sort')
    sortpriop = request.GET.get('sortpriop') == 'true'

    # find parent node
    nqs = Node.objects.filter(slug=slug)
    if len(nqs) == 0:
        return HttpResponseNotFound('No such parent')
    node = nqs[0]

    # calc forward/backward filters
    forward_filters = {'parent__slug': slug}
    backward_filters = {'child__slug': slug}

    if text:
        forward_filters['text__contains'] = text
        backward_filters['text__contains'] = text

    # calc orderbys
    orderby = []

    sortmap = {
        'views': Relation.views.field_name,
        'vote': Relation.vote.field_name,
        'date': Relation.created.field_name
    }

    modifier = '-' if sortdir == 'desc' else ''

    if sort in sortmap:
        orderby.append(modifier + sortmap[sort])

    resp = []

    def fetch(direction, filters, excludes=None):

        rqs = Relation.objects.filter(**filters)

        if excludes is not None:
            rqs = rqs.exclude(**excludes)

        rqs = rqs.order_by(*orderby).prefetch_related('userrelation_set')

        for r in rqs:

            reldict = r.make_json_response_dict()
            reldict['direction'] = direction

            if request.user.is_active:
                reldict['visited'] = len(r.userrelation_set.filter(user=request.user)) > 0

            resp.append(reldict)

    if sortpriop:
        # in priop mode, we first filter for results specifically for author, add those
        # then for resutls specifically not for author, and add those

        fetch('forward', {**forward_filters, 'author': node.author})
        fetch('forward', forward_filters, {'author': node.author})

        fetch('backwards', {**backward_filters, 'author': node.author})
        fetch('backwards', backward_filters, {'author': node.author})

    else:
        fetch('forward', forward_filters)
        fetch('backwards', backward_filters)

    return JsonResponse(resp, safe=False)


def xhr_nodes_for_text(request, text):
    return JsonResponse(
        [n.make_json_response_dict(request.user)
         for n in Node.objects.filter(name__contains=text)],
        safe=False)


def xhr_user(request):

    doc = False
    if request.method != 'GET':
        doc = ujson.loads(request.body)

    if doc and 'new' in doc and doc['new']:
        try:
            r = requests.post(
                settings.RECAPTCHAV3_VERIFY_URL,
                data={
                    'secret': settings.RECAPTCHAV3_SECRET_KEY,
                    'response': doc['recaptcha_token'],
                    'remoteip': doc['ipaddr']
                })

            google_response = ujson.loads(r.text)

            if not (google_response['action'] == 'createuser' and
                    google_response['success'] and
                    google_response['score'] > 0.5):

                return HttpResponseForbidden('Failure to verify captcha: ' + r.text)

        except Exception as ex:
            return HttpResponseForbidden('Failure to verify captcha: ' + str(ex))

        # check if username is used
        uqs = User.objects.filter(username=doc['username'])
        if len(uqs) > 0:
            return HttpResponseForbidden('This username is already taken.')

        if len(doc['password']) < 5:
            return HttpResponseForbidden('Password must be at least 5 characters.')

        if not re.match('[^@]+@[^@]+\.[^@]+', doc['email']):
            return HttpResponseForbidden('Email address must at least APPEAR valid.')

        user = User.objects.create(
            username=make_safe(doc['username']),
            email=make_safe(doc['email']),
            is_active=False)
        user.set_password(doc['password'])
        user.save()

        try:
            rv = RegistrationView()
            rv.request = request
            rv.send_activation_email(user)
        except Exception as ex:
            return HttpResponseForbidden('Failure to send activation email: ' + str(ex))

        userobj = {
            'email': user.email,
            'username': user.username
        }

        return JsonResponse(userobj, safe=False)

    user = request.user
    userobj = {
        'last_login': request.user.last_login.strftime('%Y-%m-%d'),
        'is_superuser': request.user.is_superuser,
        'email': request.user.email,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'username': request.user.username,
    }

    if request.method == 'PUT':
        doc = ujson.loads(request.body)

        reauth = False

        if 'email' in doc:
            if not re.match('[^@]+@[^@]+\.[^@]+', doc['email']):
                return HttpResponseForbidden('Email address must at least APPEAR valid.')

            user.email = make_safe(doc['email'])

        if 'first_name' in doc:
            user.first_name = make_safe(doc['first_name'])

        if 'last_name' in doc:
            user.last_name = make_safe(doc['last_name'])

        if 'password' in doc:
            if len(doc['password']) < 5:
                return HttpResponseForbidden('Password must be at least 5 characters.')

            user.set_password(doc['password'])
            reauth = True

        user.save()

        if reauth:
            user = authenticate(request, username=make_safe(doc['username']), password=doc['password'])
            login(request, user)
            userobj['csrf_token'] = get_token(request)

    userobj['has_password'] = request.user.has_usable_password()

    try:
        google_login = user.social_auth.get(provider='google-oauth2')
        userobj['google_uid'] = google_login.uid
    except UserSocialAuth.DoesNotExist:
        pass

    try:
        facebook_login = user.social_auth.get(provider='facebook')
        userobj['facebook_uid'] = facebook_login.uid
    except UserSocialAuth.DoesNotExist:
        pass

    return JsonResponse(userobj, safe=False)


def xhr_vote(request, slug, direction):

    if not request.user.is_active:
        return JsonResponse({'success': False, 'reason': 'You are not logged in'}, safe=False)

    rqs = Relation.objects.filter(slug=slug)
    if len(rqs) == 0:
        return HttpResponseNotFound('No such relation')

    relation = rqs[0]

    user_relation, created = UserRelation.objects.get_or_create(
        user=request.user,
        relation=relation)

    if user_relation.vote == -1 and direction == 'down':
        return JsonResponse({'success': False, 'reason': 'You already voted down on this item'}, safe=False)

    if user_relation.vote == 1 and direction == 'up':
        return JsonResponse({'success': False, 'reason': 'You already voted up on this item'}, safe=False)

    if direction == 'up':
        user_relation.vote = 1
        relation.vote += 1

    elif direction == 'down':
        user_relation.vote = -1
        relation.vote -= 1

    relation.save()
    user_relation.save()

    return JsonResponse({'success': True}, safe=False)


def xhr_notifications(request):

    if not request.user.is_active:
        return JsonResponse([], safe=False)

    notifications = Notification.objects.filter(user=request.user).order_by('-created')

    return JsonResponse([n.make_json_response_dict(request.user) for n in notifications], safe=False)


def xhr_notification(request, notification_id):

    if request.method == 'DELETE':
        Notification.objects.filter(user=request.user, id=notification_id).delete()
        return JsonResponse({}, safe=False)

    return JsonResponse({}, safe=False)


def xhr_logout(request):
    try:
        logout(request)
        return JsonResponse({'success': True}, safe=False)

    except Exception as ex:
        return JsonResponse({'success': False, 'reason': str(ex)}, safe=False)


def xhr_login(request):
    doc = ujson.loads(request.body)
    user = authenticate(request, username=doc['username'], password=doc['password'])
    if user is None:
        return JsonResponse({'success': False, 'reason': 'Invalid login'}, safe=False)

    login(request, user)
    return JsonResponse({'success': True, 'csrf_token': get_token(request)}, safe=False)


def node(request, slug=None):
    response = render(
        request,
        'forest.html',
        {
            'user': request.user,
            'ipaddr': request.META['REMOTE_ADDR'],
            'recaptcha_site_key': settings.RECAPTCHAV3_SITE_KEY
        })

    return response
