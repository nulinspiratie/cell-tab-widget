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
        min_index : 1,
        backup_trigger : false,
        load_backup_trigger : false,
        base_name : '',
        show_all_trigger : false,
        show_ungrouped_trigger : false,
        show_initialization_trigger : false
    })
});

var CellHiderView = widgets.DOMWidgetView.extend({

    render: function () {
         this.model.set('previous_value', 'none')
        this.value_changed();
        this.model.on('change:value', this.value_changed, this);

        this.model.on('change:backup_trigger', this.backup, this);
        this.model.on('change:load_backup_trigger', this.load_backup, this);
        this.model.on('change:show_all_trigger', this.show_all_base, this);
        this.model.on('change:show_ungrouped_trigger', this.show_ungrouped, this);
        this.model.on('change:show_initialization_trigger', this.show_initialization, this);
        this.patch_actions();
    },

    value_changed: function() {
        var previous_value = this.model.get('previous_value');
        var value = this.model.get('value');
        console.log(`value changed from ${previous_value} to ${value}`);

        if (previous_value !== 'none' && !previous_value.includes('+')){
            this.tag_cells(previous_value)
        }

        if (!value.includes('+')){
            this.show_cells(value)
        }
    },

    backup: function() {
        var cells = Jupyter.notebook.get_cells();
        for (let cell of cells) {
            if (cell.metadata.cell_tab !== undefined){
                cell.metadata.cell_tab_backup = cell.metadata.cell_tab;
            }
        }
    },

    load_backup: function() {
        var cells = Jupyter.notebook.get_cells();
        for (let cell of cells) {
            if (cell.metadata.cell_tab_backup !== undefined){
                cell.metadata.cell_tab = cell.metadata.cell_tab_backup;
            }
        }
        var value = this.model.get('value');
        this.hide_all_cells_except(value);
        this.show_cells(value)
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
        console.log(`Hiding all cells except beginning with value ${name}`);
        this.hide_all_cells_except(name);
        console.log(`Showing cells with value ${name}`);
        var cells = Jupyter.notebook.get_cells();
        for (let cell of cells) {
            if (cell.metadata.cell_tab !== undefined && cell.metadata.cell_tab.startsWith(name)){
                this.show_cell(cell)
            }
        }
    },

    show_all_cells: function() {
        console.log('Showing all cells')
        for (let cell of Jupyter.notebook.get_cells()) {
            this.show_cell(cell)
        }
    },

    show_initialization: function() {
        console.log('Showing initialization cells')
        this.hide_all_cells();

        var base_name = this.model.get('base_name');
        console.log(`Showing all initialization cells starting with base ${base_name}`)
        for (let cell of Jupyter.notebook.get_cells()) {
            if (cell.metadata.init_cell === true && cell.metadata.cell_tab.startsWith(base_name)) {
                this.show_cell(cell);
            }
        }
    },

    show_all_base: function() {
        this.hide_all_cells();
        var base_name = this.model.get('base_name');
        if (base_name !== '') {
            console.log(`Showing all cells starting with base ${base_name}`)
            this.show_cells(base_name)
        } else {
            this.show_all_cells()
        }
    },

    show_ungrouped: function() {
        console.log('Showing ungrouped cells');
        var all_names = this.model.get('names');
        var min_index = this.model.get('min_index');
        for (let cell of  Jupyter.notebook.get_cells()) {
            if (Jupyter.notebook.find_cell_index(cell) <= min_index){
                // Before the tab cell, ignore
                continue;
            }

            if (cell.metadata.cell_tab == 'stop'){
                // Reached stop cell
                break;
            }

            if (all_names.indexOf(cell.metadata.cell_tab) < 0) {
                console.log(`Displaying ungrouped ${cell.metadata.cell_tab}`)
                this.show_cell(cell)
            } else {
                this.hide_cell(cell)
            }
        }
    },

    hide_cell: function(cell) {
        console.debug(`Sliding up cell ${cell.get_text()}`)
        cell.element.slideUp('fast');
        cell.metadata.hidden = true;
    },

    show_cell: function(cell) {
        console.debug(`Sliding down cell ${cell.get_text()}`)
        cell.element.slideDown('fast');
        delete cell.metadata.hidden
    },

    patch_actions: function() {
        console.log(log_prefix, 'patching Jupyter up/down actions');

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
        // disable any events related to delete.Cell. In particular,
        // collapsible_headings unhides any cells without headings
        Jupyter.notebook.events.off('delete.Cell');
        Jupyter.notebook.events.off('create.Cell');
        Jupyter.notebook.events.off('delete.Cell');
        Jupyter.notebook.events.off('rendered.MarkdownCell');
    },
});


module.exports = {
    CellHiderModel : CellHiderModel,
    CellHiderView : CellHiderView
};