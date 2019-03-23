define(
    ['jquery',
        'underscore',
        'backbone',
        'tpl!templates/inventory'
    ],
    function($, _, Backbone, inventorytpl) {
        return Backbone.View.extend({

            template: inventorytpl,

            events: {
                'click tr': 'click_view_item',
                'click div.inventory_quantity': 'click_quantity',
                'click span.inventory_drop': 'click_inventory_drop',
                'click span.inventory_edit': 'click_inventory_edit',
                'click div.drawer_close_button': 'close_inventory',
                'keyup input.inventory_quantity_edit': 'keyup_inventory_quantity_edit'
            },

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.user = options.user;
            },

            render: function() {
                this.$el.html(this.template({ username: this.user.get('username'), inventory: this.user.get('items') }));
                this.$el.find('table').DataTable();
            },

            close_inventory: function(evt) {
                this.$el.hide();
            },

            find_useritem_for_id: function(id) {
                return _.find(this.user.get('items'), function(useritem) { return useritem.get('id') == id; });
            },

            click_view_item: function(evt) {
                var useritem = this.find_useritem_for_id($(evt.target).closest('tr').data('id'));
                if(useritem) {
                    var description_node = useritem.get('item').get('description_node');

                    if(description_node) {
                        Backbone.history.navigate('/f/' + description_node, true);
                    }
                }
            },

            click_quantity: function(evt) {
                $(evt.target).hide();
                $(evt.target).parent().find('input.inventory_quantity_edit').show();
            },

            click_inventory_drop: function(evt) {
                evt.stopPropagation();
                var self = this;

                if (!$(evt.target).hasClass('red')) {
                    $(evt.target).addClass('red');

                } else {
                    var drop_useritem = this.find_useritem_for_id($(evt.target).closest('tr').data('id'));

                    if(drop_useritem) {
                        drop_useritem.destroy({
                            success: function() {
                                self.user.fetch({
                                    success: function() {
                                        self.forest_view.refresh_choices();
                                        self.render();
                                    },
                                    error: function(xhr, err) {
                                        self.forest_view.add_error('Could not refresh user: '+err.responseText);
                                    }
                                });
                            },
                            error: function(xhr, err) {
                                self.forest_view.add_error('Could not drop: '+err.responseText);
                            }
                        });
                    }
                }
            },

            click_inventory_edit: function(evt) {
                evt.stopPropagation();
                var useritem = this.find_useritem_for_id($(evt.target).closest('tr').data('id'));
                this.forest_view.item_edit(useritem.get('item'));
            },

            keyup_inventory_quantity_edit: function(evt) {
                var self = this;

                var useritem = this.find_useritem_for_id($(evt.target).closest('tr').data('id'));
                var old_qty = useritem.get('quantity');
                var new_qty = $(evt.target).val();

                var complaint_div = $(evt.target).parent().find('div.inventory_quantity_complaint');
                if(new_qty != old_qty && (!useritem.get('item').get('droppable'))) {
                    complaint_div.html('This item is not droppable so you may not modify the quantity.');
                } else if(new_qty > old_qty) {
                    complaint_div.html('You may not increase the quantity.');
                } else {
                    complaint_div.html('');
                }

                var allow = true;
                if(complaint_div.html() != '') {
                    allow = false;
                    if(useritem.get('item').get('author') != this.user.get('username')) {
                        $(evt.target).val(old_qty);
                    } else {
                        allow = true;
                        complaint_div.append($(document.createElement('span')).html('  (AUTHOR OVERRIDE)'));
                    }
                }

                if(allow && evt.which == 13) {
                    useritem.set('quantity', new_qty);
                    useritem.save(
                        {},
                        {
                            success: function() {
                                complaint_div.html('');
                                $(evt.target).hide();
                                $(evt.target).parent().find('input.inventory_quantity').show();

                                self.forest_view.refresh_choices();
                                self.render();
                            },
                            error: function(xhr, err) {
                                self.forest_view.add_error(err.responseText);
                            }
                        });
                    return;
                }
            }

        });
    });
