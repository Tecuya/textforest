# Generated by Django 2.1.5 on 2019-03-26 00:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('forest', '0017_relationitem_hide'),
    ]

    operations = [
        migrations.AddField(
            model_name='relation',
            name='sticky_ordering',
            field=models.IntegerField(default=1001),
        ),
    ]
