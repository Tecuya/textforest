from django.db import models
from django.contrib.auth.models import User

from django.db.models import Sum, Count


class Node(models.Model):
    author = models.ForeignKey(User, on_delete=models.PROTECT)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, default='')
    text = models.TextField(default='')

    def __str__(self):
        return self.name

    def make_json_response_dict(self):
        return {
            'name': self.name,
            'slug': self.slug,
            'text': self.text,
            'author': self.author.username,
            'created': self.created.strftime('%Y-%m-%d')}


class Relation(models.Model):
    author = models.ForeignKey(User, on_delete=models.PROTECT)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    views = models.IntegerField(default=0)
    vote = models.IntegerField(default=0)

    slug = models.CharField(max_length=255, default='')
    text = models.TextField(default='')

    parent = models.ForeignKey('Node', related_name='outbound_relations', on_delete=models.CASCADE)
    child = models.ForeignKey('Node', related_name='inbound_relations', on_delete=models.CASCADE)

    def __str__(self):
        return '%s > %s (%s)' % (self.parent, self.child, self.text[:20])

    def update_user_relations(self):
        stats = UserRelation.objects.filter(relation=self).aggregate(vote=Sum('vote'), views=Count('*'))
        self.views = stats['views']
        self.vote = stats['vote']
        self.save()

    def make_json_response_dict(self):
        return {'text': self.text,
                'slug': self.slug,
                'parent': self.parent.slug,
                'child': self.child.slug,
                'author': self.author.username,
                'views': self.views,
                'vote': self.vote,
                'created': self.created.strftime('%Y-%m-%d')}


class UserRelation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    relation = models.ForeignKey(Relation, on_delete=models.CASCADE)

    vote = models.SmallIntegerField(default=0)

    def __str__(self):
        return '%s %s - %s' % (self.user, self.relation, self.vote)

    @staticmethod
    def handle_user_action(user, relation, vote=None):

        user_relation, created = UserRelation.objects.get_or_create(user=user, relation=relation)

        if vote is not None:
            user_relation.vote += 1
            user_relation.save()

        relation.update_user_relations()
