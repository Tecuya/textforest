# Generated by Django 2.1.7 on 2019-03-19 23:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('forest', '0013_auto_20190319_1905'),
    ]

    operations = [
        migrations.RenameField(
            model_name='item',
            old_name='public_can_give',
            new_name='public_can_link',
        ),
        migrations.AlterField(
            model_name='item',
            name='slug',
            field=models.CharField(default='', max_length=255, unique=True),
        ),
        migrations.AlterField(
            model_name='node',
            name='slug',
            field=models.CharField(default='', max_length=255, unique=True),
        ),
        migrations.AlterField(
            model_name='relation',
            name='slug',
            field=models.CharField(default='', max_length=255, unique=True),
        ),
    ]
