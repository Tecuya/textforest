from django.contrib import admin
from django.conf import settings
from django.urls import path, re_path, include
from django.contrib.auth import views as auth_views

import forest.views
from django.contrib.staticfiles.urls import staticfiles_urlpatterns


urlpatterns = [
    path('admin/', admin.site.urls),

    path('', forest.views.node, name='home'),
    path('f/<slug>', forest.views.node, name='node'),

    path('xhr/logout', forest.views.xhr_logout, name='xhr_logout'),
    path('xhr/login', forest.views.xhr_login, name='xhr_login'),
    path('xhr/user', forest.views.xhr_user, name='xhr_user'),

    path('xhr/delete_relation/<slug>', forest.views.xhr_delete_relation, name='xhr_delete_relation'),
    path('xhr/create_relation', forest.views.xhr_create_relation, name='xhr_create_relation'),
    path('xhr/node_by_slug/<slug>', forest.views.xhr_node_by_slug, name='xhr_node_by_slug'),
    path('xhr/nodes_for_text/<text>', forest.views.xhr_nodes_for_text, name='xhr_nodes_for_text'),
    path('xhr/relations_for_parent_node/<slug>', forest.views.xhr_relations_for_parent_node, name='xhr_relations_for_parent_node'),
    path('xhr/relations/<slug>', forest.views.xhr_relations, name='xhr_relations_for_slug'),
    path('xhr/relations/<slug>/<text>', forest.views.xhr_relations, name='xhr_relations_for_text'),

    re_path(r'^oauth/', include('social_django.urls', namespace='social')),
    path('account/', include('django.contrib.auth.urls'))

]

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
