cell-tab-widget
===============================

A Jupyter widget to sort cells into tabs

Installation
------------

To install use pip:

    $ pip install celltabwidget
    $ jupyter nbextension enable --py --sys-prefix celltabwidget


For a development installation (requires npm),

    $ git clone https://github.com//cell-tab-widget.git
    $ cd cell-tab-widget
    $ pip install -e .
    $ jupyter nbextension install --py --symlink --sys-prefix celltabwidget
    $ jupyter nbextension enable --py --sys-prefix celltabwidget
