Configuration Guide
===================

This guide explains how to configure OppNDA for your needs.

Configuration Files
-------------------

OppNDA uses JSON configuration files located in the ``config/`` directory:

- ``averager_config.json`` - Report averaging settings
- ``analysis_config.json`` - Visualization settings
- ``regression_config.json`` - Machine learning settings

Using the GUI
-------------

The easiest way to configure OppNDA is through the web GUI:

1. Start the server: ``python OppNDA.py``
2. Open http://localhost:5001
3. Navigate to the Settings page
4. Adjust settings and click Save

Manual Configuration
--------------------

For advanced users, edit the JSON files directly.

See :doc:`../developer_guide` for detailed configuration options.
