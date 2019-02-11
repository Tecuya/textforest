from django.shortcuts import render
from django.http import JsonResponse, HttpResponseNotFound, HttpResponseNotAllowed

import ujson
from slugify import slugify

from .models import Node, Relation


def xhr_delete_relation(request, slug):

    if request.method == 'DELETE':
        rqs = Relation.objects.filter(slug=slug)
        if len(rqs) == 0:
            return HttpResponseNotFound('<h1>No such relation</h1>')

        rqs[0].delete()

    return JsonResponse({}, safe=False)


def xhr_create_relation(request):

    if not request.method == 'POST':
        return HttpResponseNotAllowed('<h1>POST only on this endpoint..</h1>')

    doc = ujson.loads(request.body)

    new_relation_slug = slugify(doc['text'])

    # resolve parent node
    nqs = Node.objects.filter(slug=doc['parent'])
    if len(nqs) == 0:
        return HttpResponseNotFound('<h1>No such parent</h1>')
    parent = nqs[0]

    if 'child' in doc:
        # if client specified a child slug it MUST be found or we fail
        nqs = Node.objects.filter(slug=doc['child'])
        if len(nqs) == 0:
            return HttpResponseNotFound('<h1>No such child</h1>')
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
        return HttpResponseNotFound('<h1>No such node</h1>')

    node = nqs[0]

    if request.method == 'POST' or request.method == 'PUT':
        doc = ujson.loads(request.body)
        node.name = doc['name']
        node.slug = slugify(doc['name'])
        node.text = doc['text']
        node.save()

    elif request.method == 'DELETE':
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


def node(request):
    return render(
        request,
        'forest.html',
        {'user': request.user})
