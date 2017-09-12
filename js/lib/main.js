/**
 * Created by Serwan Asaad on 11-Sep-17.
 */
var widgets = require('@jupyter-widgets/base');
var _ = require('lodash');


var log_prefix = '[cell_hider]';
var CellHiderModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name : 'CellHiderModel',
        _view_name : 'CellHiderView',
        _model_module : 'cell-tab-widget',
        _view_module : 'cell-tab-widget',
        _model_module_version : '0.1.0',
        _view_module_version : '0.1.0',
        previous_value : 'none',
        value : 'default',
        min_index : 1
    })
});

var CellHiderView = widgets.DOMWidgetView.extend({

    render: function () {
        this.value_changed();
        this.model.on('change:value', this.value_changed, this);
        patch_Notebook();
        patch_actions();
    },

    value_changed: function() {
        var previous_value = this.model.get('previous_value');
        var value = this.model.get('value');
        console.log(`value changed from ${previous_value} to ${value}`);

        if (previous_value !== 'none' && previous_value !== 'all'){
            this.tag_cells(previous_value)
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
        console.log(`Tagging cells ${name}`);
        var cells = Jupyter.notebook.get_cells()
        var min_index = this.model.get('min_index');
        for (let cell of cells) {
            if (Jupyter.notebook.find_cell_index(cell) <= min_index){
                // Before the tab cell, ignore
                continue;
            }

            if (cell.metadata.cell_tab == 'stop'){
                // Reached stop cell
                break;
            }

            if(cell.metadata.hidden !== true){
                // Not hidden, tag cell
                cell.metadata.cell_tab = name;
            }
        }
    },

    hide_all_cells: function(){
        var cells = Jupyter.notebook.get_cells();
        var min_index = this.model.get('min_index');
        for (let cell of cells) {
            if (Jupyter.notebook.find_cell_index(cell) <= min_index){
                // Before the tab cell, ignore
                continue;
            }

            if (cell.metadata.cell_tab === 'stop'){
                break;
            }

            this.hide_cell(cell)
        }
    },

    hide_all_cells_except: function(name) {
        console.log(`Hiding all cells except ${name}`);
        var cells = Jupyter.notebook.get_cells();
        var min_index = this.model.get('min_index');
        for (let cell of cells) {
            if (Jupyter.notebook.find_cell_index(cell) <= min_index){
                // Before the tab cell, ignore
                continue;
            }
            if (cell.metadata.cell_tab === 'stop'){
                break;
            }
            if (cell.metadata.cell_tab !== name){
                this.hide_cell(cell)
            }
        }
    },

    show_cells: function(name) {
        console.log(`Showing cells with value ${name}`);
        var cells = Jupyter.notebook.get_cells();
        for (let cell of cells) {
            if (cell.metadata.cell_tab === name){
                this.show_cell(cell)
            }
        }
    },

    show_all_cells: function() {
        console.log(`Showing all cells`);
        var cells = Jupyter.notebook.get_cells();
        for (let cell of cells) {
            this.show_cell(cell)
        }
    },

    hide_cell: function(cell) {
        cell.element.slideUp('fast')
        cell.metadata.hidden = true;
    },

    show_cell: function(cell) {
        cell.element.find("div.input").parent("div.cell").css("display", "")
        delete cell.metadata.hidden
    }
});

function patch_Notebook () {
    return new Promise(function (resolve, reject) {
            console.debug(log_prefix, 'patching Notebook.protoype');

            // we have to patch select, since the select.Cell event is only fired
            // by cell click events, not by the notebook select method
            var orig_notebook_select = notebook.Notebook.prototype.select;
            notebook.Notebook.prototype.select = function (index, moveanchor) {
                if (select_reveals) {
                    reveal_cell_by_index(index);
                }
                return orig_notebook_select.apply(this, arguments);
            };

            // we have to patch undelete, as there is no event to bind to. We
            // could bind to create.Cell, but that'd be a bit OTT
            var orig_notebook_undelete = notebook.Notebook.prototype.undelete;
            notebook.Notebook.prototype.undelete = function () {
                var ret = orig_notebook_undelete.apply(this, arguments);
                update_collapsed_headings();
                return ret;
            };

            resolve();
        }).catch(function on_reject (reason) {
        console.warn(log_prefix, 'error patching Notebook.protoype:', reason);
    })
};

function patch_actions () {
    return new Promise(
        function (resolve, reject) {
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
    }).catch(function on_reject (reason) {
        console.warn(log_prefix, 'error patching Jupyter up/down actions:', reason);
    });
}


module.exports = {
    CellHiderModel : CellHiderModel,
    CellHiderView : CellHiderView
};