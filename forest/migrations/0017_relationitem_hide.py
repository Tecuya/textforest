# Generated by Django 2.1.5 on 2019-03-23 02:15

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('forest', '0016_auto_20190320_2147'),
    ]

    operations = [
        migrations.AddField(
            model_name='relationitem',
            name='hide',
            field=models.BooleanField(default=False),
        ),
    ]
