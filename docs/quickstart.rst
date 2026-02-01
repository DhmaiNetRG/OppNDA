Quick Start
===========

Get started with OppNDA in 5 minutes.

Prerequisites
-------------

- Python 3.8+
- ONE Simulator (for generating reports)

Installation
------------

1. Clone the repository:

.. code-block:: bash

    git clone https://github.com/yourusername/OppNDA.git
    cd OppNDA

2. Install dependencies:

.. code-block:: bash

    pip install -r requirements.txt

3. (Optional) Install development dependencies:

.. code-block:: bash

    pip install -r requirements-dev.txt


Running OppNDA
--------------

**Start the GUI:**

.. code-block:: bash

    python OppNDA.py

Open http://localhost:5001 in your browser.

**Run post-processing only:**

.. code-block:: bash

    # Average reports
    python core/averager.py

    # Generate visualizations
    python core/analysis.py

    # Train regression models
    python core/regression.py


Project Structure
-----------------

.. code-block:: text

    OppNDA/
    +-- app/                 # Flask application
    |   +-- api.py          # REST API endpoints
    |   +-- routes.py       # Web routes
    +-- core/                # Core processing modules
    |   +-- averager.py     # Report averaging
    |   +-- analysis.py     # Visualization
    |   +-- regression.py   # ML models
    |   +-- resource_manager.py
    +-- config/              # Configuration files
    +-- GUI/                 # Frontend files
    +-- reports/             # Input report files
    +-- plots/               # Output visualizations


Next Steps
----------

- :doc:`user_guide/configuration` - Configure OppNDA
- :doc:`developer_guide` - Development documentation
- :doc:`modules/api` - API Reference
