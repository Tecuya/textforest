# Generated by Django 2.1.7 on 2019-03-18 02:14

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('forest', '0009_item_slug'),
    ]

    operations = [
        migrations.CreateModel(
            name='RelationItem',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('interaction', models.CharField(choices=[('require', 'requires'), ('consume', 'consumes'), ('give', 'gives')], max_length=100)),
                ('quantity', models.IntegerField()),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='forest.Item')),
            ],
        ),
        migrations.AddField(
            model_name='relation',
            name='hide_when_requirements_unmet',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='relation',
            name='repeatable',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='relationitem',
            name='relation',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='forest.Relation'),
        ),
    ]
