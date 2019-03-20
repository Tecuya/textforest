import re
import ujson
import requests

from django.shortcuts import render
from django.http import JsonResponse, HttpResponseNotFound, HttpResponseNotAllowed, HttpResponseForbidden
from django.contrib.auth import logout, authenticate, login
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.conf import settings
from django.db.models import Q

from django_registration.backends.activation.views import RegistrationView
from social_django.models import UserSocialAuth

from .models import UserItem, Item, Node, Relation, RelationItem, UserRelation, Subscription, Notification

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


def xhr_node_by_forward_relation_slug(request, slug):
    return xhr_node_by_relation_slug(request, slug, 'forward')


def xhr_node_by_backward_relation_slug(request, slug):
    return xhr_node_by_relation_slug(request, slug, 'backward')


def xhr_node_by_relation_slug(request, slug, direction):

    if request.user.is_active:
        r = Relation.objects.get(slug=slug)

        allow, reason = UserRelation.handle_user_action(request.user, r)

        if not allow:
            return HttpResponseForbidden('You lack necessary items: ' + reason)

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


def xhr_node_by_slug(request, slug=None):

    is_user_page = slug is not None and len(slug) and slug[0] == '~'

    if is_user_page:

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

    elif slug is not None:

        nqs = Node.objects.filter(slug=slug)
        if nqs is None or len(nqs) == 0:

            # special handling for user pages
            return HttpResponseNotFound('No such node')

        node = nqs[0]

    else:
        node = Node(author=request.user)

    if request.method == 'POST' or request.method == 'PUT':
        doc = ujson.loads(request.body)

        if node.author is not None and node.author != request.user:
            return HttpResponseForbidden('This node does not belong to you')

        node.author = request.user

        if not is_user_page:
            node.name = make_safe(doc['name'])
            node.slug = slugify(doc['name'])

        node.text = make_safe(doc['text'])
        node.show_backward_relations = bool(doc['show_backward_relations'])
        node.public_can_link = bool(doc['public_can_link'])
        node.save()

        for subscription in node.subscription_set.exclude(user=request.user):
            Notification.objects.create(
                user=subscription.user,
                subscription=subscription,
                actor=request.user,
                node=node,
                action=(Notification.ACTION_CREATE if request.method == 'POST' else Notification.ACTION_MODIFY))

    elif request.method == 'DELETE':

        if is_user_page:
            return HttpResponseForbidden('User pages cannot be deleted.')

        if node.author != request.user:
            return HttpResponseForbidden('This node does not belong to you')

        node.delete()

        return JsonResponse({}, safe=False)

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
        [r.make_json_response_dict(request.user)
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

    def fetch(direction, filters, excludes=None, unique=False):

        rqs = Relation.objects.filter(**filters)

        if excludes is not None:
            rqs = rqs.exclude(**excludes)

        rqs = rqs.order_by(*orderby).prefetch_related('userrelation_set')

        if unique:
            rqs = rqs.distinct()

        for r in rqs:

            reldict = r.make_json_response_dict(request.user)
            reldict['direction'] = direction

            resp.append(reldict)

    if sortpriop:
        # in priop mode, we first filter for results specifically for author, add those
        # then for resutls specifically not for author, and add those

        fetch('forward', {**forward_filters, 'author': node.author})
        fetch('forward', forward_filters, {'author': node.author})

        if node.show_backward_relations:
            fetch('backward', {**backward_filters, 'author': node.author})
            fetch('backward', backward_filters, {'author': node.author})

    else:
        fetch('forward', forward_filters)

        if node.show_backward_relations:
            fetch('backward', backward_filters)

    return JsonResponse(resp, safe=False)


def xhr_nodes_for_text(request, text):
    return JsonResponse(
        [n.make_json_response_dict(request.user)
         for n in Node.objects.filter(name__contains=text)],
        safe=False)


def xhr_items_for_text(request, text):
    return JsonResponse(
        [i.make_json_response_dict()
         for i in Item.objects.filter(name__contains=text)],
        safe=False)


def xhr_relation_by_slug(request, slug=None):

    if not request.user.is_active:
        return HttpResponseForbidden('You are not logged in')

    if slug is not None:
        relation = Relation.objects.get(slug=slug)
    else:
        relation = Relation(author=request.user)

    if request.method in ('PUT', 'POST'):
        doc = ujson.loads(request.body)

        if relation.author is not None and relation.author != request.user:
            return HttpResponseForbidden('This node does not belong to you')

        relation.author = request.user
        relation.text = make_safe(doc['text'])

        if request.method == 'POST':
            relation.slug = uniqueify(Relation, make_safe(slugify('{} {}'.format(request.user.username, doc['text']))))

        relation.parent = Node.objects.get(
            Q(author=request.user) | Q(public_can_link=True),
            slug=doc['parent'])

        if 'child' in doc:
            relation.child = Node.objects.get(
                Q(author=request.user) | Q(public_can_link=True),
                slug=doc['child'])
        else:
            relation.child = relation.parent

        relation.only_discoverable_via_ac_x_chars = int(doc['only_discoverable_via_ac_x_chars'])

        relation.repeatable = bool(doc['repeatable'])
        relation.hide_when_requirements_unmet = bool(doc['hide_when_requirements_unmet'])
        relation.only_visible_to_node_owner = bool(doc['only_visible_to_node_owner'])

        relation.relationitem_set.all().delete()
        relation.save()

        for ri in doc['relationitems']:
            RelationItem.objects.create(
                relation=relation,
                interaction=ri['interaction'],
                quantity=int(ri['quantity']),
                item=Item.objects.get(
                    Q(author=request.user) | Q(public_can_link=True),
                    slug=ri['item']))


    elif request.method == 'DELETE':
        relation = Relation.objects.filter(author=request.user, slug=slug).delete()
        return JsonResponse({}, safe=False)

    else:
        return HttpResponseForbidden('unimp')

    return JsonResponse(relation.make_json_response_dict(), safe=False)


def xhr_item_by_slug(request, slug=None):

    if not request.user.is_active:
        return HttpResponseForbidden('You are not logged in')

    if request.method in ('POST', 'PUT'):
        doc = ujson.loads(request.body)

        if request.method == 'POST':
            item, created = Item.objects.get_or_create(author=request.user, name=doc['name'])

            if not created:
                return HttpResponseForbidden('An item by this name already exists for this user')

            item.slug = uniqueify(Item, make_safe(slugify('{} {}'.format(request.user.username, doc['name']))))

        else:

            item = Item.objects.get(slug=slug)
            item.name = make_safe(doc['name'])

        item.max_quantity = int(doc['max_quantity'])
        item.droppable = doc['droppable']
        item.public_can_link = doc['public_can_link']

        if 'description_node' in doc and doc['description_node'] is not None and len(doc['description_node']) > 0:
            item.description_node = Node.objects.get(
                Q(author=request.user) | Q(public_can_link=True),
                slug=doc['description_node'])

        item.save()

    elif request.method == 'DELETE':
        item = Item.objects.filter(author=request.user, slug=slug).delete()
        return JsonResponse({}, safe=False)

    else:
        item = Item.objects.get(slug=slug)

    return JsonResponse(item.make_json_response_dict(), safe=False)


def make_user_obj(user):
    return {
        'last_login': user.last_login.strftime('%Y-%m-%d'),
        'is_superuser': user.is_superuser,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'username': user.username,
        'items': [ui.make_json_response_dict() for ui in user.useritem_set.all()]
    }


def xhr_useritem_by_id(request, useritem_id):

    ui = UserItem.objects.get(id=useritem_id)

    if request.user != ui.user:
        return HttpResponseForbidden('You do not own this UserItem.')

    if request.method == 'DELETE':

        if not ui.item.droppable and ui.item.author != request.user:
            return HttpResponseForbidden('Cannot drop undroppable item.')

        ui.delete()
        return JsonResponse({}, safe=False)

    elif request.method == 'PUT':

        doc = ujson.loads(request.body)

        complaints = []
        if int(doc['quantity']) < ui.quantity:
            if not ui.item.droppable:
                complaints.append('This item is not droppable.')

        if int(doc['quantity']) > ui.quantity:
            complaints.append('You may not increase the quantity.')

        if len(complaints) and ui.item.author != request.user:
            return HttpResponseForbidden(' '.join(complaints))

        ui.quantity = int(doc['quantity'])

        if ui.quantity == 0:
            ui.delete()
        else:
            ui.save()

        return JsonResponse(ui.make_json_response_dict(), safe=False)

    else:
        return HttpResponseForbidden('unimp')


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

    userobj = {}
    if request.method == 'PUT':
        doc = ujson.loads(request.body)

        reauth = False

        if 'items' in doc:
            current_useritem_slugs = set(ui.item.slug for ui in user.useritem_set.all())
            desired_useritem_slugs = set(i['slug'] for i in doc['items'])

            delete_slugs = current_useritem_slugs - desired_useritem_slugs
            add_slugs = desired_useritem_slugs - current_useritem_slugs

            UserItem.objects.filter(user=user, item__slug__in=delete_slugs).delete()

            for i in add_slugs:
                UserItem.objects.create(user=user, item=Item.objects.get(slug=i))

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

    return_user = {
        **make_user_obj(user),
        **userobj
    }

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

    return JsonResponse(return_user, safe=False)


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

    return JsonResponse([n.make_json_response_dict() for n in notifications], safe=False)


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

    ctx = {
        'user': request.user,
        'ipaddr': request.META['REMOTE_ADDR'],
        'recaptcha_site_key': settings.RECAPTCHAV3_SITE_KEY
    }

    if request.user and not request.user.is_anonymous:
        ctx['userobj'] = ujson.dumps(make_user_obj(request.user))
    else:
        ctx['userobj'] = '{}'

    return render(request, 'forest.html', ctx)


def xhr_nodes_for_user(request):

    if not request.user.is_active:
        return HttpResponseForbidden('You are not logged in')

    return JsonResponse(
        [n.make_json_response_dict() for n in Node.objects.filter(author=request.user)],
        safe=False)


def xhr_items_for_user(request):

    if not request.user.is_active:
        return HttpResponseForbidden('You are not logged in')

    return JsonResponse(
        [i.make_json_response_dict() for i in Item.objects.filter(author=request.user)],
        safe=False)


def xhr_relations_for_user(request):

    if not request.user.is_active:
        return HttpResponseForbidden('You are not logged in')

    return JsonResponse(
        [r.make_json_response_dict() for r in Relation.objects.filter(author=request.user)],
        safe=False)
