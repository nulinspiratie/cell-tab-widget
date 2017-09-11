/**
 * Created by Serwan Asaad on 11-Sep-17.
 */
var widgets = require('@jupyter-widgets/base');
var Jupyter = require('base/js/namespace');
var _ = require('lodash');


var log_prefix = '[cell_hider]';

var CellHiderView = widgets.DOMWidgetView.extend({

    render: function() {
        this.min_index = Jupyter.notebook.get_selected_index();

        this.value_changed();
        this.model.on('change:value', this.value_changed, this);
        patch_actions();
    },

    value_changed: function() {
        var previous_value = this.model.get('previous_value');
        var value = this.model.get('value');
        console.log('value changed');
        this.el.textContent = value;

        if (previous_value !== 'none'){
            this.tag_cells(value)
        }

        if (value === 'all'){
            this.show_all_cells()
        }
        else{
            this.hide_all_cells_except(value);
            this.show_cells(value)
        }
    },

    tag_cells: function(name){
        cells = Jupyter.notebook.get_cells();

    },

    hide_all_cells: function(){
        var cells = Jupyter.notebook.get_cells();
        for (let cell of cells) {
            if (cell.metadata.hasOwnProperty('cell_tab') && cell.metadata.cell_tab === 'stop'){
                break;
            }
            this.hide_cell(cell)
        }
    },

    hide_all_cells_except: function(name) {
        var cells = Jupyter.notebook.get_cells();
        for (let cell of cells) {
            if (cell.metadata.hasOwnProperty('cell_tab') && cell.metadata.cell_tab === 'stop'){
                break;
            }
            if (cell.metadata.hasOwnProperty('cell_tab') && cell.metadata.cell_tab !== name){
                this.hide_cell(cell)
            }
        }
    },

    show_cells: function(name) {
        var cells = Jupyter.notebook.get_cells();
        for (let cell of cells) {
            if (cell.metadata.hasOwnProperty('cell_tab') && cell.metadata.cell_tab === name){
                this.show_cell(cell)
            }
        }
    },

    show_all_cells: function() {
        var cells = Jupyter.notebook.get_cells();
        for (let cell of cells) {
            this.show_cell(cell)
        }
    },

    hide_cell: function(cell) {
        cell.element.find("div.input").parent("div.cell").css("display", "none")
    },

    show_cell: function(cell) {
        cell.element.find("div.input").parent("div.cell").css("display", "")
    }
});

function patch_actions () {
    return new Promise(function (resolve, reject) {
        require(['notebook/js/tooltip'], function on_success (tooltip) {
            console.debug(log_prefix, 'patching Jupyter up/down actions');

            var kbm = Jupyter.keyboard_manager;

            var action_up = kbm.actions.get(kbm.command_shortcuts.get_shortcut('up'));
            var orig_up_handler = action_up.handler;
            action_up.handler = function (env) {
                for (var index = env.notebook.get_selected_index() - 1; (index !== null) && (index >= 0); index--) {
                    if (env.notebook.get_cell(index).element.is(':visible')) {
                        env.notebook.select(index);
                        env.notebook.focus_cell();
                        return;
                    }
                }
                return orig_up_handler.apply(this, arguments);
            };

            var action_down = kbm.actions.get(kbm.command_shortcuts.get_shortcut('down'));
            var orig_down_handler = action_down.handler;
            action_down.handler = function (env) {
                var ncells = env.notebook.ncells();
                for (var index = env.notebook.get_selected_index() + 1; (index !== null) && (index < ncells); index++) {
                    if (env.notebook.get_cell(index).element.is(':visible')) {
                        env.notebook.select(index);
                        env.notebook.focus_cell();
                        return;
                    }
                }
                return orig_down_handler.apply(this, arguments);
            };

            resolve();
        }, reject);
    }).catch(function on_reject (reason) {
        console.warn(log_prefix, 'error patching Jupyter up/down actions:', reason);
    });
}

return {
    CellHiderView : CellHiderView
};