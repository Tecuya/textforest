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

from .models import Node, Relation

from slugify import slugify


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

    doc = ujson.loads(request.body)

    new_relation_slug = slugify(doc['text'])

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

        uniqueifier = 0
        new_slug = new_relation_slug

        while True:

            if uniqueifier != 0:
                new_slug = new_relation_slug + '-' + str(uniqueifier)

            nqs = Node.objects.filter(slug=new_slug)
            if len(nqs) == 0:
                break

            uniqueifier += 1

        child = Node.objects.create(
            author=request.user,
            name=doc['text'],
            slug=new_slug)

    relation, created = Relation.objects.get_or_create(
        author=request.user,
        slug=slugify(doc['text']),
        parent=parent,
        child=child,
        text=doc['text'])

    return JsonResponse(
        {'slug': relation.slug,
         'child': relation.child.slug,
         'text': relation.text,
         'author': relation.author.username,
         'created': relation.created.strftime('%Y-%m-%d')},
        safe=False)


def xhr_node_by_slug(request, slug):

    nqs = Node.objects.filter(slug=slug)
    if nqs is None or len(nqs) == 0:
        return HttpResponseNotFound('No such node')

    node = nqs[0]

    if request.method == 'POST' or request.method == 'PUT':
        doc = ujson.loads(request.body)

        if node.author != request.user:
            return HttpResponseForbidden('This node does not belong to you')

        node.name = doc['name']
        node.slug = slugify(doc['name'])
        node.text = doc['text']
        node.save()

    elif request.method == 'DELETE':

        if node.author != request.user:
            return HttpResponseForbidden('This node does not belong to you')

        node.delete()

    return JsonResponse(
        {'name': node.name,
         'slug': node.slug,
         'text': node.text,
         'author': node.author.username,
         'created': node.created.strftime('%Y-%m-%d')},
        safe=False)


def xhr_relations_for_parent_node(request, slug):
    return JsonResponse(
        [{'text': r.text,
          'slug': r.slug,

          'parent': r.parent.slug,
          'child': r.child.slug,

          'author': r.author.username,
          'created': r.created.strftime('%Y-%m-%d')}
         for r in Relation.objects.filter(parent__slug=slug).order_by('-created')],
        safe=False)


def xhr_relations(request, slug, text=None):

    filters = {'parent__slug': slug}

    if text:
        filters['text__contains'] = text

    return JsonResponse(
        [{'text': r.text,
          'slug': r.slug,

          'parent': r.parent.slug,
          'child': r.child.slug,

          'author': r.author.username,
          'created': r.created.strftime('%Y-%m-%d')}
         for r in Relation.objects.filter(**filters).order_by('-created')],
        safe=False)


def xhr_nodes_for_text(request, text):
    return JsonResponse(
        [{'name': n.name,
          'slug': n.slug,
          'author': n.author.username,
          'created': n.created.strftime('%Y-%m-%d')}
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
            username=doc['username'],
            email=doc['email'],
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

            user.email = doc['email']

        if 'first_name' in doc:
            user.first_name = doc['first_name']

        if 'last_name' in doc:
            user.last_name = doc['last_name']

        if 'password' in doc:
            if len(doc['password']) < 5:
                return HttpResponseForbidden('Password must be at least 5 characters.')

            user.set_password(doc['password'])
            reauth = True

        user.save()

        if reauth:
            user = authenticate(request, username=doc['username'], password=doc['password'])
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
