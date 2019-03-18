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

    def find_last_branching_node(self):
        node = self
        while True:
            rqs = Relation.objects.filter(child=node)
            if len(rqs) > 1:
                return rqs[0].parent
            else:
                node = rqs[0].parent
        return node

    def make_json_response_dict(self, user=None):

        rdict = {
            'name': self.name,
            'slug': self.slug,
            'text': self.text,
            'author': self.author.username,
            'created': self.created.strftime('%Y-%m-%d'),
            'items': [ni.item.make_json_response_dict(user) for ni in self.nodeitem_set.all()]
        }

        if user is not None and user.is_active:
            rdict['subscribed'] = len(self.subscription_set.filter(user=user)) > 0

        return rdict

    def __str__(self):
        return '"{}" by {} {}'.format(self.name, self.author, self.created.strftime('%Y-%m-%d'))


class Relation(models.Model):
    author = models.ForeignKey(User, on_delete=models.PROTECT)

    require_item = models.ForeignKey('Item', on_delete=models.CASCADE, blank=True, null=True, default=None)

    views = models.IntegerField(default=0)
    vote = models.IntegerField(default=0)

    slug = models.CharField(max_length=255, default='')
    text = models.TextField(default='')

    parent = models.ForeignKey('Node', related_name='outbound_relations', on_delete=models.CASCADE)
    child = models.ForeignKey('Node', related_name='inbound_relations', on_delete=models.CASCADE)

    repeatable = models.BooleanField(default=True)
    hide_when_requirements_unmet = models.BooleanField(default=False)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def update_user_relations(self):
        stats = UserRelation.objects.filter(relation=self).aggregate(vote=Sum('vote'), views=Count('*'))
        self.views = stats['views']
        self.vote = stats['vote']
        self.save()

    def make_json_response_dict(self, user=None):
        robj = {'text': self.text,
                'slug': self.slug,
                'parent': self.parent.slug,
                'parent_name': self.parent.name,
                'child': self.child.slug,
                'author': self.author.username,
                'views': self.views,
                'vote': self.vote,
                'created': self.created.strftime('%Y-%m-%d')}

        if user is not None and self.require_item is not None:
            robj['require_item'] = self.require_item.make_json_response_dict(user)

        return robj

    def __str__(self):

        return '{} > {} ({}) by {} {}'.format(
            self.parent, self.child, self.text[:20], self.author, self.created.strftime('%Y-%m-%d'))


class RelationItem(models.Model):

    INTERACTION_REQUIRE = 'require'
    INTERACTION_CONSUME = 'consume'
    INTERACTION_GIVE = 'give'

    INTERACTIONS = (
        (INTERACTION_REQUIRE, 'requires'),
        (INTERACTION_CONSUME, 'consumes'),
        (INTERACTION_GIVE, 'gives')
    )

    relation = models.ForeignKey(Relation, on_delete=models.CASCADE)

    interaction = models.CharField(choices=INTERACTIONS, max_length=100)
    quantity = models.IntegerField()
    item = models.ForeignKey('Item', on_delete=models.CASCADE)

    def __str__(self):
        return '{} {} {}'.format(self.relation, self.interaction, self.quantity, self.item)


class UserRelation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    relation = models.ForeignKey(Relation, on_delete=models.CASCADE)

    vote = models.SmallIntegerField(default=0)

    @staticmethod
    def handle_user_action(user, relation, vote=None):

        user_relation, created = UserRelation.objects.get_or_create(user=user, relation=relation)

        if vote is not None:
            user_relation.vote += 1
            user_relation.save()

        relation.update_user_relations()

    def __str__(self):
        return '{} followed {} and voted {}'.format(self.user, self.relation, self.vote)


class Subscription(models.Model):

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    node = models.ForeignKey(Node, on_delete=models.CASCADE)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return '{} subscribed to {}'.format(self.user, self.node)


class Notification(models.Model):

    ACTION_CREATE = 'create'
    ACTION_DELETE = 'delete'
    ACTION_MODIFY = 'modify'

    ACTIONS = ((ACTION_CREATE, 'created'),
               (ACTION_DELETE, 'deleted'),
               (ACTION_MODIFY, 'modified'))

    ACTIONMAP = dict(ACTIONS)

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE)

    actor = models.ForeignKey(User, on_delete=models.PROTECT, related_name='notification_actor')
    node = models.ForeignKey(Node, on_delete=models.CASCADE)
    relation = models.ForeignKey(Relation, on_delete=models.CASCADE, blank=True, null=True)

    action = models.CharField(choices=ACTIONS, default=ACTION_MODIFY, max_length=100)

    read = models.BooleanField(default=False)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def make_json_response_dict(self):
        return {
            'id': self.id,
            'user': self.user.username,
            'node_slug': self.node.slug,
            'node_name': self.node.text,
            'relation_slug': self.relation.slug if self.relation is not None else '',
            'relation_name': self.relation.text if self.relation is not None else '',
            'actor': self.actor.username,
            'action': self.ACTIONMAP.get(self.action),
            'read': self.read,
            'created': self.created.strftime('%Y-%m-%d %H:%M:%S')}

    def __str__(self):
        return '{} {} {} {} {}'.format(self.user, self.actor, self.action, self.node, self.relation)


class NodeItem(models.Model):
    node = models.ForeignKey('Node', on_delete=models.CASCADE)
    item = models.ForeignKey('Item', on_delete=models.CASCADE)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('node', 'item')

    def __str__(self):
        return '{} has item {}'.format(self.node, self.item)


class Item(models.Model):

    author = models.ForeignKey(User, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, default='')

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('author', 'name')

    def make_json_response_dict(self, user=None):
        rdict = {'name': self.name,
                 'slug': self.slug,
                 'author': self.author.username,
                 'created': self.created.strftime('%Y-%m-%d')}

        if user is not None and not user.is_anonymous and user.is_active:
            rdict['owned'] = len(user.useritem_set.filter(item=self)) > 0

        return rdict

    def __str__(self):
        return '{} by {} {}'.format(self.name, self.name, self.created.strftime('%Y-%m-%d'))


class UserItem(models.Model):

    user = models.ForeignKey(User, on_delete=models.PROTECT)
    item = models.ForeignKey('Item', on_delete=models.CASCADE)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'item')

    def __str__(self):
        return '{} owns {}'.format(self.user, self.item)
