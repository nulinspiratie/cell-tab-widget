from time import sleep
import ipywidgets as widgets
from IPython.display import display
from traitlets import Unicode, Int, Bool
from typing import Union
from collections import OrderedDict


class CellHiderWidget(widgets.DOMWidget):
    _view_name = Unicode('CellHiderView').tag(sync=True)
    _model_name = Unicode('CellHiderModel').tag(sync=True)
    _view_module = Unicode('cell-tab-widget').tag(sync=True)
    _model_module = Unicode('cell-tab-widget').tag(sync=True)
    _view_module_version = Unicode('^0.1.0').tag(sync=True)
    _model_module_version = Unicode('^0.1.0').tag(sync=True)

    previous_value = Unicode('none').tag(sync=True)
    value = Unicode('default').tag(sync=True)
    min_index = Int(1).tag(sync=True)
    backup = Bool(False).tag(sync=True)
    load_backup = Bool(False).tag(sync=True)


class CellTab(widgets.Tab):
    cell_hider_widget = None
    def __init__(self, names: Union[list, dict], parent=None, min_index=1):
        super().__init__()

        if isinstance(names, list):
            names = {name: {} for name in names}
        self.names = names
        self.parent = parent
        self.children = []

        if names:
            for k, (name, tab_names) in enumerate(names.items()):
                if tab_names:
                    self.add_subtab(tab_names)
                else:
                    self.add_subtab_button()
                self.set_title(k, name)

        # Add plus tab
        new_tab_text_widget = widgets.Text(placeholder='New tab name')
        new_tab_text_widget.continuous_update = False
        new_tab_text_widget.observe(self._handle_tab_button_click, 'value')

        save_backup_button_widget = widgets.Button(description='Backup')
        save_backup_button_widget.on_click(self.backup)

        load_backup_button_widget = widgets.Button(description='Load backup')
        load_backup_button_widget.on_click(self.load_backup)

        self.add_child(widgets.VBox([new_tab_text_widget,
                                     save_backup_button_widget,
                                     load_backup_button_widget]))
        self.set_title(len(self.children)-1, '+')

        self.observe(self._handle_tab_change, 'selected_index')

        if parent is None:
            # Add the widget that actually handles the hiding
            CellTab.cell_hider_widget = CellHiderWidget()
            self.cell_hider_widget.min_index = min_index
            if names:
                self.cell_hider_widget.value = list(names)[0]

            display(self.cell_hider_widget)
            display(self)

    @property
    def relative_name(self):
        name = ''
        if self.children:
            name += self.get_title(self.selected_index)
            selected_child = self.children[self.selected_index]
            if isinstance(selected_child, CellTab):
                name += f'.{selected_child.relative_name}'

        return name

    @property
    def name(self):
        if self.parent:
            return self.parent.name
        else:
            return self.relative_name

    def _handle_tab_button_click(self, change):
        idx = len(self.children) - 1
        self.add_subtab_button(index=idx)
        self.set_title(idx, change['new'])
        self.set_title(idx+1, '+')

        if idx == 0:
            # print('First tab to be added')
            self.cell_hider_widget.previous_value = self.name
            self.cell_hider_widget.value = self.name
        else:
            self.cell_hider_widget.previous_value = self.cell_hider_widget.value
            self.cell_hider_widget.value = self.name


    def _handle_tab_change(self, change):
        tab = change['owner']
        tab_name = tab.get_title(change['new'])
        if tab_name == '+':
            return
        elif self.parent is not None:
            self.parent._handle_tab_change(change)
        else:
            # print('changing value in Python')
            self.cell_hider_widget.previous_value = self.cell_hider_widget.value
            self.cell_hider_widget.value = self.name

    def _handle_subtab_button_click(self, change):
        subtab = self.add_subtab([], index=self.selected_index, replace=True)

    def get_tab_dict(self):
        if hasattr(self, 'children') and len(self.children) > 1:
            d = OrderedDict()
            for k, child in enumerate(self.children):
                name = self.get_title(k)
                if name == '+':
                    continue
                elif hasattr(child, 'get_tab_dict'):
                    d[name] = child.get_tab_dict()
                else:
                    d[name] = []
            return d
        else:
            return []

    def backup(self, change):
        self.cell_hider_widget.backup = not self.cell_hider_widget.backup

    def load_backup(self, change):
        self.cell_hider_widget.load_backup = not self.cell_hider_widget.load_backup

    def add_subtab_button(self, index=None, replace=False):
        button = widgets.Button(
            description='Create subtab',
            disabled=False,
            button_style=''
        )
        button.parent = self
        button.on_click(self._handle_subtab_button_click)
        self.add_child(button, index=index, replace=replace)

    def add_subtab(self,  tab_names, index=None, replace=False):
        subtab = CellTab(tab_names, parent=self)
        self.add_child(subtab, index=index, replace=replace)
        return subtab

    def add_child(self, child, index=None, replace=False):
        children = list(self.children)
        if index is None:
            children = children + [child]
        elif replace:
            children[index] = child
        else:
            children.insert(index, child)
        self.children = children
        return child