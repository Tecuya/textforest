from collections import defaultdict

from django.db import models
from django.contrib.auth.models import User

from django.db.models import Sum, Count


class Node(models.Model):
    author = models.ForeignKey(User, on_delete=models.PROTECT)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    show_backward_relations = models.BooleanField(default=True)
    public_can_link = models.BooleanField(default=True)

    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, default='', unique=True)
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
            'show_backward_relations': self.show_backward_relations,
            'public_can_link': self.public_can_link,
            'author': self.author.username,
            'created': self.created.strftime('%Y-%m-%d')
        }

        if user is not None and user.is_active:
            rdict['subscribed'] = len(self.subscription_set.filter(user=user)) > 0

        return rdict

    def __str__(self):
        return '"{}" by {} {}'.format(self.name, self.author, self.created.strftime('%Y-%m-%d'))


class Relation(models.Model):
    author = models.ForeignKey(User, on_delete=models.PROTECT)

    views = models.IntegerField(default=0)
    vote = models.IntegerField(default=0)

    slug = models.CharField(max_length=255, default='', unique=True)
    text = models.TextField(default='')

    parent = models.ForeignKey('Node', related_name='outbound_relations', on_delete=models.CASCADE)
    child = models.ForeignKey('Node', related_name='inbound_relations', on_delete=models.CASCADE)

    only_discoverable_via_ac_x_chars = models.IntegerField(default=0)

    repeatable = models.BooleanField(default=False)
    hide_when_requirements_unmet = models.BooleanField(default=False)
    only_visible_to_node_owner = models.BooleanField(default=False)
    sticky_ordering = models.IntegerField(default=1001)
    
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
                'visited': user is not None and user.is_active and len(self.userrelation_set.filter(user=user)) > 0,
                'only_discoverable_via_ac_x_chars': self.only_discoverable_via_ac_x_chars,
                'repeatable': self.repeatable,
                'hide_when_requirements_unmet': self.hide_when_requirements_unmet,
                'only_visible_to_node_owner': self.only_visible_to_node_owner,
                'sticky_ordering': self.sticky_ordering,
                'created': self.created.strftime('%Y-%m-%d'),
                'relationitems': [ri.make_json_response_dict(user) for ri in self.relationitem_set.all()]}

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
    hide = models.BooleanField(default=False)

    def make_json_response_dict(self, user):
        return {
            'interaction': self.interaction,
            'quantity': self.quantity,
            'item': self.item.make_json_response_dict(),
            'hide': self.hide
        }

    def __str__(self):
        return '{} {} {} {}'.format(self.relation, self.interaction, self.quantity, self.item)


class UserRelation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    relation = models.ForeignKey(Relation, on_delete=models.CASCADE)

    vote = models.SmallIntegerField(default=0)

    @staticmethod
    def handle_user_action(user, relation, vote=None):

        fails = []
        ui_to_save = []

        user_relation, created = UserRelation.objects.get_or_create(user=user, relation=relation)

        if created or relation.repeatable:

            relation_item_list = list(RelationItem.objects.filter(relation=relation))

            useritem_map = {}

            def get_useritem(item):
                if item.id not in useritem_map:
                    uiqs = UserItem.objects.filter(user=user, item=item)

                    if len(uiqs) > 0:
                        ui = uiqs[0]
                    else:
                        ui = UserItem(user=user, item=item)

                    useritem_map[item.id] = ui

                return useritem_map[item.id]

            # step 1; enforce 'require'
            for ri in filter(lambda x: x.interaction == 'require', relation_item_list):
                ui = get_useritem(ri.item)
                if ui is None:
                    fails.append('You need {} {} but you have none.'.format(ri.quantity, ri.item))
                elif ui.quantity < ri.quantity:
                    fails.append('You need {} {} but you only have {}.'.format(ri.quantity, ri.item, ui.quantity))

            # step 2; sum up all relations so we have a single integer per item
            item_net_results = defaultdict(int)
            for ri in RelationItem.objects.filter(relation=relation):
                if ri.interaction == 'consume':
                    item_net_results[ri.item] -= ri.quantity
                elif ri.interaction == 'give':
                    item_net_results[ri.item] += ri.quantity

            # step 3: apply integers, enforce 'consume' along the way
            for item, qty in item_net_results.items():

                if qty == 0:
                    continue

                ui = get_useritem(item)

                orig_qty = ui.quantity
                ui.quantity += qty
                if ui.quantity < 0:
                    fails.append('You do not have enough of item {}.  You have {} and you need {} more.'.format(item.name, orig_qty, abs(ui.quantity)))
                    continue

                if ui.item.max_quantity > 0 and ui.quantity > ui.item.max_quantity:
                    ui.quantity = ui.item.max_quantity

                ui_to_save.append(ui)

        if len(fails) > 0:
            return False, ' '.join(fails)

        for ui in ui_to_save:
            if ui.quantity == 0:
                ui.delete()
            else:
                ui.save()

        if vote is not None:
            user_relation.vote += 1
            user_relation.save()

        relation.update_user_relations()

        return True, ''

    def __str__(self):
        return '{} "{}" vote: {}'.format(self.user, self.relation, self.vote)


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
            'node_name': self.node.name,
            'relation_slug': self.relation.slug if self.relation is not None else '',
            'relation_name': self.relation.text if self.relation is not None else '',
            'actor': self.actor.username,
            'action': self.ACTIONMAP.get(self.action),
            'read': self.read,
            'created': self.created.strftime('%Y-%m-%d %H:%M:%S')}

    def __str__(self):
        return '{} {} {} {} {}'.format(self.user, self.actor, self.action, self.node, self.relation)


class Item(models.Model):

    author = models.ForeignKey(User, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, default='', unique=True)

    description_node = models.ForeignKey(Node, blank=True, null=True, default=None, on_delete=models.PROTECT)

    max_quantity = models.IntegerField(default=0)
    droppable = models.BooleanField(default=True)
    public_can_link = models.BooleanField(default=True)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('author', 'name')

    def make_json_response_dict(self, user=None):
        rdict = {'name': self.name,
                 'slug': self.slug,
                 'author': self.author.username,
                 'description_node': self.description_node.slug if self.description_node is not None else None,
                 'max_quantity': self.max_quantity,
                 'droppable': self.droppable,
                 'public_can_link': self.public_can_link,
                 'created': self.created.strftime('%Y-%m-%d')}

        return rdict

    def __str__(self):
        return '"{}" by {}'.format(self.name, self.author)


class UserItem(models.Model):

    user = models.ForeignKey(User, on_delete=models.PROTECT)
    item = models.ForeignKey('Item', on_delete=models.CASCADE)

    quantity = models.IntegerField(default=0)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'item')

    def make_json_response_dict(self):
        return {
            'id': self.id,
            'item': self.item.make_json_response_dict(),
            'quantity': self.quantity,
            'created': self.created.strftime('%Y-%m-%d')
        }

    def __str__(self):
        return '{} owns {} {}'.format(self.user, self.quantity, self.item)
