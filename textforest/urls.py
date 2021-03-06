from django.contrib import admin
from django.conf import settings
from django.urls import path, re_path, include
from django.contrib.auth import views as auth_views

import forest.views
from django.contrib.staticfiles.urls import staticfiles_urlpatterns


urlpatterns = [
    path('admin/', admin.site.urls),

    # browser endpoints
    path('', forest.views.node, name='home'),
    path('f/<slug>', forest.views.node, name='node'),
    path('r/<slug>', forest.views.node, name='node'),

    # user management
    path('xhr/user', forest.views.xhr_user, name='xhr_user'),
    path('xhr/logout', forest.views.xhr_logout, name='xhr_logout'),
    path('xhr/login', forest.views.xhr_login, name='xhr_login'),

    # site navigation
    path('xhr/node_by_forward_relation_slug/<slug>',
         forest.views.xhr_node_by_forward_relation_slug, name='xhr_node_by_forward_relation_slug'),
    path('xhr/node_by_backward_relation_slug/<slug>',
         forest.views.xhr_node_by_backward_relation_slug, name='xhr_node_by_backward_relation_slug'),

    # backbone DELETE/POST/PUT paths
    path('xhr/node_by_slug/<slug>', forest.views.xhr_node_by_slug, name='xhr_node_by_slug'),
    path('xhr/node_by_slug', forest.views.xhr_node_by_slug, name='xhr_node_by_slug'),
    path('xhr/relation_by_slug', forest.views.xhr_relation_by_slug, name='xhr_relation_by_slug'),
    path('xhr/relation_by_slug/<slug>', forest.views.xhr_relation_by_slug, name='xhr_relation_by_slug'),
    path('xhr/item_by_slug', forest.views.xhr_item_by_slug, name='xhr_item_by_slug'),
    path('xhr/item_by_slug/<slug>', forest.views.xhr_item_by_slug, name='xhr_item_by_slug'),
    path('xhr/useritem_by_id/<useritem_id>', forest.views.xhr_useritem_by_id, name='xhr_useritem_by_id'),

    # autocomplete endpoints
    path('xhr/nodes_for_text', forest.views.xhr_nodes_for_text, name='xhr_nodes_for_text'),
    path('xhr/items_for_text', forest.views.xhr_items_for_text, name='xhr_items_for_text'),
    path('xhr/relations_for_node_slug/<slug>', forest.views.xhr_relations_for_node_slug, name='xhr_relations_for_slug'),

    # manage content endpoints
    path('xhr/nodes_for_user', forest.views.xhr_nodes_for_user, name='xhr_nodes_for_user'),
    path('xhr/items_for_user', forest.views.xhr_items_for_user, name='xhr_items_for_user'),
    path('xhr/relations_for_user', forest.views.xhr_relations_for_user, name='xhr_relations_for_user'),

    # subscriptions
    path('xhr/subscribe/<slug>', forest.views.xhr_subscribe, name='xhr_subscribe'),
    path('xhr/unsubscribe/<slug>', forest.views.xhr_unsubscribe, name='xhr_unsubscribe'),

    # voting
    path('xhr/relation/vote/<slug>/<direction>', forest.views.xhr_vote, name='xhr_vote'),

    # notifications
    path('xhr/notifications', forest.views.xhr_notifications, name='xhr_notifications'),
    path('xhr/notification/<notification_id>', forest.views.xhr_notification, name='xhr_notifications'),

    # registration / oauth
    re_path(r'^oauth/', include('social_django.urls', namespace='social')),
    path('account/', include('django.contrib.auth.urls')),
    path('account/', include('django_registration.backends.activation.urls'))
]

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
