import ipywidgets as widgets
from IPython.display import display
from traitlets import Unicode
from typing import Union


class CellHiderWidget(widgets.DOMWidget):
    _view_name = Unicode('CellHiderView').tag(sync=True)
    _view_module = Unicode('cell_hider').tag(sync=True)
    _view_module_version = Unicode('0.1.0').tag(sync=True)
    previous_value = Unicode('none').tag(sync=True)
    value = Unicode('default').tag(sync=True)


class CellTab(widgets.Tab):
    def __init__(self, names: Union[list, dict], parent=None):
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
        self.add_child(new_tab_text_widget)
        self.set_title(len(self.children)-1, '+')

        self.observe(self._handle_tab_change, 'selected_index')

        if parent is None:
            # Add the widget that actually handles the hiding
            self.cell_hider_widget = CellHiderWidget()
            if names:
                self.cell_hider_widget.value = list(names)[0]

            display(self.cell_hider_widget)
            display(self)

    @property
    def name(self):
        name = ''
        if self.children:
            name += self.get_title(self.selected_index)
            selected_child = self.children(self.selected_index)
            if isinstance(selected_child, CellTab):
                name += f'.{selected_child.name}'

        return name

    def _handle_tab_button_click(self, change):
        idx = len(self.children) - 1
        self.add_subtab_button(index=idx)
        self.set_title(idx, change['new'])
        self.set_title(idx+1, '+')

    def _handle_tab_change(self, change):
        # TODO Look into, broken
        tab = change['owner']
        name = tab.get_title(change['new'])
        if name == '+':
            return
        elif self.parent is not None:
            self.parent._handle_tab_change(change)
        else:
            tab.cell_hider_widget.previous_value = tab.get_title(change['old'])
            if name != '+':
                tab.cell_hider_widget.value = self.name

    def _handle_subtab_button_click(self, change):
        self.add_subtab([], index=self.selected_index, replace=True)

    def add_subtab_button(self, index=None, replace=False):
        button = widgets.Button(
            description='Create subtab',
            disabled=False,
            button_style=''
        )
        button.on_click(self._handle_subtab_button_click)
        self.add_child(button, index=index, replace=replace)

    def add_subtab(self,  tab_names, index=None, replace=False):
        subtab = CellTab(tab_names, is_primary=False)
        self.add_child(subtab, index=index, parent=self)
        return subtab

    def add_child(self, child, index=None, replace=False):
        children = list(self.children)
        if index is None:
            children = children + [child]
        elif replace:
            children[index] = child
        else:
            children.insert(index, child)
        print(f'adding child {child} into {children}')
        self.children = children
        return child