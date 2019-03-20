# Generated by Django 2.1.7 on 2019-03-19 19:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('forest', '0012_useritem_quantity'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='relation',
            name='require_item',
        ),
        migrations.AddField(
            model_name='relation',
            name='only_discoverable_via_ac_x_chars',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='relation',
            name='only_visible_to_node_owner',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='relation',
            name='repeatable',
            field=models.BooleanField(default=False),
        ),
    ]