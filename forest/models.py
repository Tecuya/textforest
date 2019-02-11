from django.db import models
from django.contrib.auth.models import User


class Node(models.Model):
    author = models.ForeignKey(User, on_delete=models.PROTECT)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, default='')
    text = models.TextField(default='')

    def __str__(self):
        return self.name


class Relation(models.Model):
    author = models.ForeignKey(User, on_delete=models.PROTECT)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    slug = models.CharField(max_length=255, default='')
    text = models.TextField(default='')

    parent = models.ForeignKey('Node', related_name='parent_node', on_delete=models.CASCADE)
    child = models.ForeignKey('Node', related_name='child_node', on_delete=models.CASCADE)

    def __str__(self):
        return '%s > %s (%s)' % (self.parent, self.child, self.text[:20])
