// Default values for interface settings
const interfaceSettings = [
    { name: "btInterface", type: "SimpleBroadcastInterface", transmitSpeed: "250k", transmitRange: "10" },
    { name: "highspeedInterface", type: "SimpleBroadcastInterface", transmitSpeed: "10M", transmitRange: "1000" }
];

// Interface Tagify will be initialized in DOMContentLoaded
// Default values for group settings
const groupSettings = [
    { groupID: 'p', numHosts: 5, movementModel: "ShortestPathMapBasedMovement", routeFile: "", routeType: 0, router: "EpidemicRouter", activeTimes: "0", messageTTL: "50", actions: "Edit/Delete" },
    { groupID: 'c', numHosts: 10, movementModel: "ShortestPathMapBasedMovement", routeFile: "", routeType: 0, router: "EpidemicRouter", activeTimes: "0", messageTTL: "100", actions: "Edit/Delete" },
    { groupID: 'w', numHosts: 20, movementModel: "ShortestPathMapBasedMovement", routeFile: "", routeType: 0, router: "EpidemicRouter", activeTimes: "0", messageTTL: "150", actions: "Edit/Delete" },
    { groupID: 't', numHosts: 15, movementModel: "MapRouteMovement", routeFile: "data/tram3.wkt", routeType: 1, router: "EpidemicRouter", activeTimes: "0", messageTTL: "200", actions: "Edit/Delete" },
    { groupID: 't', numHosts: 12, movementModel: "MapRouteMovement", routeFile: "data/tram4.wkt", routeType: 2, router: "EpidemicRouter", activeTimes: "0", messageTTL: "250", actions: "Edit/Delete" },
    { groupID: 't', numHosts: 8, movementModel: "MapRouteMovement", routeFile: "data/tram10.wkt", routeType: 2, router: "EpidemicRouter", activeTimes: "0", messageTTL: "300", actions: "Edit/Delete" }
];

// ============================================================================
// QUICK START FUNCTIONS
// ============================================================================

function closeQuickStart() {
    const modal = document.getElementById('quickStartModal');
    modal.style.display = 'none';

    // Save preference if checkbox is checked
    if (document.getElementById('dontShowAgain')?.checked) {
        localStorage.setItem('oppnda_quickstart_seen', 'true');
    }
}

function showQuickStart() {
    document.getElementById('quickStartModal').style.display = 'flex';
}

// Example scenario presets
const EXAMPLE_SCENARIOS = {
    urban: {
        name: 'Urban DTN Scenario',
        scenarioName: 'urban_dtn',
        endTime: 43200,
        numHosts: 50,
        bufferSize: '5M; 10M; 20M',
        msgTtl: '300; 600',
        routers: ['EpidemicRouter', 'ProphetRouter', 'SprayAndWaitRouter'],
        rngSeeds: '1; 2; 3',
        worldSize: '4500, 3400',
        warmup: 1000
    },
    campus: {
        name: 'Campus Network Scenario',
        scenarioName: 'campus_network',
        endTime: 86400,
        numHosts: 100,
        bufferSize: '10M',
        msgTtl: '600',
        routers: ['EpidemicRouter', 'ProphetRouter'],
        rngSeeds: '1; 2; 3; 4; 5',
        worldSize: '3000, 2000',
        warmup: 500
    }
};

function loadExampleScenario(type) {
    const scenario = EXAMPLE_SCENARIOS[type];
    if (!scenario) {
        console.error('Unknown scenario type:', type);
        return;
    }

    // Populate form fields
    document.getElementById('scenarioName').value = scenario.scenarioName;
    document.getElementById('endTime').value = scenario.endTime;
    document.getElementById('commonNumberOfHost').value = scenario.numHosts;
    document.getElementById('commonBufferSize').value = scenario.bufferSize;
    document.getElementById('commonTtl').value = scenario.msgTtl;
    document.getElementById('rngSeed').value = scenario.rngSeeds;
    document.getElementById('worldSize').value = scenario.worldSize;
    document.getElementById('warmup').value = scenario.warmup;

    // Update router Tagify
    const routerInput = document.getElementById('commonRouter');
    if (routerInput && routerInput._tagify) {
        routerInput._tagify.removeAllTags();
        routerInput._tagify.addTags(scenario.routers);
    }

    // Update batch preview
    updateBatchPreview();

    // Show confirmation
    showSaveStatus(`✓ Loaded "${scenario.name}"`, true);

    // Navigate to Scenario tab
    openTab(null, 'ScenarioSettings');
}

// Update batch count preview
function updateBatchPreview() {
    let routerCount = 1;
    let seedCount = 1;
    let ttlCount = 1;
    let bufferCount = 1;

    // Count routers from global Tagify instance
    if (window.routerTagify) {
        routerCount = window.routerTagify.value.length || 1;
    } else {
        // Fallback: try parsing the input value directly
        const routerInput = document.getElementById('commonRouter');
        if (routerInput && routerInput.value) {
            try {
                const routers = JSON.parse(routerInput.value);
                routerCount = routers.length || 1;
            } catch (e) { }
        }
    }


    // Count seeds
    const seeds = document.getElementById('rngSeed')?.value || '1';
    seedCount = (seeds.match(/;/g) || []).length + 1;

    // Count TTLs
    const ttls = document.getElementById('commonTtl')?.value || '300';
    ttlCount = (ttls.match(/;/g) || []).length + 1;

    // Count buffers
    const buffers = document.getElementById('commonBufferSize')?.value || '5M';
    bufferCount = (buffers.match(/;/g) || []).length + 1;

    const totalRuns = routerCount * seedCount * ttlCount * bufferCount;

    // Update preview element if it exists
    const previewEl = document.getElementById('batchCountPreview');
    if (previewEl) {
        previewEl.innerHTML = `
            <span>${totalRuns}</span>
            <small>${routerCount} routers × ${seedCount} seeds × ${ttlCount} TTLs × ${bufferCount} buffers</small>
        `;
    }

    return totalRuns;
}

// Make available globally for inline scripts in HTML
window.updateBatchPreview = updateBatchPreview;


// Function to populate the Interface settings table dynamically
function populateInterfaceTable() {
    const tableBody = document.getElementById("interfaceList").getElementsByTagName("tbody")[0];

    // Clear any existing content
    tableBody.innerHTML = "";

    // Add rows for each interface setting
    interfaceSettings.forEach((setting, index) => {
        const row = tableBody.insertRow();

        const cell1 = row.insertCell(0);
        cell1.innerText = setting.name;

        const cell2 = row.insertCell(1);
        cell2.innerText = setting.type;

        const cell3 = row.insertCell(2);
        cell3.innerText = setting.transmitSpeed;

        const cell4 = row.insertCell(3);
        cell4.innerText = setting.transmitRange;

        const cell5 = row.insertCell(4);
        const editButton = document.createElement("button");
        editButton.innerText = "Edit";
        editButton.className = "edit-button"; // Add class name for the Edit button
        editButton.onclick = () => editInterfaceSetting(setting);
        cell5.appendChild(editButton);

        // Add Remove button
        const removeButton = document.createElement("button");
        removeButton.innerText = "Remove";
        removeButton.className = "remove-button"; // Add class name for the Remove button
        removeButton.onclick = () => removeInterfaceSetting(index);
        cell5.appendChild(removeButton);
    });
}

// Function to populate the Group settings table dynamically
function populateGroupTable() {
    const tableBody = document.getElementById("groupList").getElementsByTagName("tbody")[0];

    // Clear any existing content
    tableBody.innerHTML = "";

    // Add rows for each group setting
    groupSettings.forEach((group, index) => {
        const row = tableBody.insertRow();

        const cell1 = row.insertCell(0);
        cell1.innerText = group.groupID;

        const cell2 = row.insertCell(1);
        cell2.innerText = group.numHosts;

        const cell3 = row.insertCell(2);
        cell3.innerText = group.movementModel;

        const cell4 = row.insertCell(3);
        cell4.innerText = group.routeFile;

        const cell5 = row.insertCell(4);
        cell5.innerText = group.routeType;

        const cell6 = row.insertCell(5);
        cell6.innerText = group.router;

        const cell7 = row.insertCell(6);
        cell7.innerText = group.activeTimes;

        const cell8 = row.insertCell(7);
        cell8.innerText = group.messageTTL;

        const cell9 = row.insertCell(8);

        // Add Edit button with class name
        const editButton = document.createElement("button");
        editButton.innerText = "Edit";
        editButton.className = "edit-button"; // Add class name for the Edit button
        editButton.onclick = () => editGroupSetting(group);
        cell9.appendChild(editButton);

        // Add Remove button with class name
        const removeButton = document.createElement("button");
        removeButton.innerText = "Remove";
        removeButton.className = "remove-button"; // Add class name for the Remove button
        removeButton.onclick = () => removeGroupSetting(index);
        cell9.appendChild(removeButton);
    });
}

// Function to remove an interface setting
function removeInterfaceSetting(index) {
    // Remove the item from the array
    interfaceSettings.splice(index, 1);

    // Re-populate the table after removal
    populateInterfaceTable();
}


function addInterface() {
    // Get the values from the form inputs
    const interfaceName = document.getElementById("interfaceName").value;
    const interfaceType = document.getElementById("interfaceType").value;
    const transmitSpeed = document.getElementById("transmitSpeed").value;
    const transmitRange = document.getElementById("transmitRange").value;

    // Validate the inputs
    if (!interfaceName || !interfaceType || !transmitSpeed || !transmitRange) {
        alert("Please fill out all fields before adding an interface.");
        return;
    }

    // Add the new interface to the `interfaceSettings` array
    const newInterface = {
        name: interfaceName,
        type: interfaceType,
        transmitSpeed: transmitSpeed,
        transmitRange: transmitRange,
    };
    interfaceSettings.push(newInterface);

    // Update the Tagify whitelist for interface selection
    updateInterfaceTagifyWhitelist();

    // Get the table body
    const tableBody = document.getElementById("interfaceList").querySelector("tbody");

    // Create a new row
    const newRow = document.createElement("tr");

    // Add cells to the row
    newRow.innerHTML = `
                <td>${interfaceName}</td>
                <td>${interfaceType}</td>
                <td>${transmitSpeed}</td>
                <td>${transmitRange}</td>
                <td>
                    <button type="button" class="edit-button" onclick="editInterfaceSetting('${interfaceName}')">Edit</button>
                    <button type="button" class="remove-button" onclick="removeInterfaceSetting('${interfaceName}')">Remove</button>
                </td>
            `;

    // Append the new row to the table body
    tableBody.appendChild(newRow);

    // Clear the form inputs
    document.getElementById("newInterfaceForm").reset();
}


// Function to remove a group setting
function removeInterfaceSetting(interfaceName) {
    // Find the index of the interface in the array
    const index = interfaceSettings.findIndex((setting) => setting.name === interfaceName);

    if (index !== -1) {
        // Remove the interface from the array
        interfaceSettings.splice(index, 1);

        // Re-populate the table
        populateInterfaceTable();

        // Update the Tagify whitelist
        updateInterfaceTagifyWhitelist();
    }
}
// Function to edit interface settings (as an example)
function editInterfaceSetting(setting) {
    // Here you can prompt for new values or open a modal to edit settings
    const newSpeed = prompt(`Edit Transmit Speed for ${setting.name}`, setting.transmitSpeed);
    const newRange = prompt(`Edit Transmit Range for ${setting.name}`, setting.transmitRange);
    if (newSpeed && newRange) {
        setting.transmitSpeed = newSpeed;
        setting.transmitRange = newRange;
    }
    populateInterfaceTable();  // Update the table with new values
}


// Array to store events
const events = [{
    eventClass: 'MessageEventGenerator',
    interval: `${25}, ${35}`,
    size: `${500}k, ${1}M`,
    hosts: `${0} , ${220}`,
    prefix: 'M'
}];
let table = document.getElementById('eventList').getElementsByTagName('tbody')[0];
let newRow = table.insertRow();

newRow.insertCell(0).textContent = `${events[0]['eventClass']}`;
newRow.insertCell(1).textContent = `${events[0]['interval']}`;
newRow.insertCell(2).textContent = `${events[0]['size']}`;
newRow.insertCell(3).textContent = `${events[0]['hosts']}`;
newRow.insertCell(4).textContent = `${events[0]['prefix']}`;
let actionCell = newRow.insertCell(5);
let deleteButton = document.createElement('button');
deleteButton.textContent = 'Delete';
deleteButton.className = 'remove-button'; // Add class name for the Delete button
deleteButton.onclick = function () {
    // Find the row to delete
    let row = deleteButton.closest('tr');

    // Remove the row from the table
    row.remove();

    // Remove the event from the array
    let index = Array.from(table.rows).indexOf(row) - 1;  // Adjusting for the header row
    events.splice(index, 1);
};
actionCell.appendChild(deleteButton);
document.getElementById('newEventForm').addEventListener('submit', function (event) {
    event.preventDefault();

    // Gather form values
    let eventClass = document.getElementById('eventClass').value;
    let intervalMin = document.getElementById('eventIntervalMin').value;
    let intervalMax = document.getElementById('eventIntervalMax').value;
    let sizeMin = document.getElementById('eventSizeMin').value;
    let sizeMax = document.getElementById('eventSizeMax').value;
    let hostsMin = document.getElementById('eventHostsMin').value;
    let hostsMax = document.getElementById('eventHostsMax').value;
    let prefix = document.getElementById('eventPrefix').value;

    // Create event object to store
    let newEvent = {
        eventClass: eventClass,
        interval: `${intervalMin}, ${intervalMax}`,
        size: `${sizeMin},${sizeMax}`,
        hosts: `${hostsMin}, ${hostsMax}`,
        prefix: prefix
    };

    // Add the event to the events array
    events.push(newEvent);

    // Create new row in the event table
    let table = document.getElementById('eventList').getElementsByTagName('tbody')[0];
    let newRow = table.insertRow();

    newRow.insertCell(0).textContent = eventClass;
    newRow.insertCell(1).textContent = `${intervalMin} to ${intervalMax}`;
    newRow.insertCell(2).textContent = `${sizeMin} to ${sizeMax} kB`;
    newRow.insertCell(3).textContent = `${hostsMin} to ${hostsMax}`;
    newRow.insertCell(4).textContent = prefix;

    // Add Action Buttons (like Delete) without using eventNo
    let actionCell = newRow.insertCell(5);
    let deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = function () {
        // Find the row to delete
        let row = deleteButton.closest('tr');

        // Remove the row from the table
        row.remove();

        // Remove the event from the array
        let index = Array.from(table.rows).indexOf(row) - 1;  // Adjusting for the header row
        events.splice(index, 1);
    };
    actionCell.appendChild(deleteButton);


});


// Add an event listener to handle the form submission
document.getElementById("newGroupForm").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the default form submission

    // Extract values from the form
    const groupID = document.getElementById("groupID").value;
    const numHosts = parseInt(document.getElementById("numberOfHosts").value, 10);
    const movementModel = document.getElementById('Movement')?.value;
    const waitTimeMin = parseFloat(document.getElementById("waitTimeMin").value) || 0;
    const waitTimeMax = parseFloat(document.getElementById("waitTimeMax").value) || 0;
    const speedMin = parseFloat(document.getElementById("speedMin").value) || 0;
    const speedMax = parseFloat(document.getElementById("speedMax").value) || 0;
    const movementRouteType = parseInt(document.getElementById("movementRouteType").value, 10);
    const bufferSize = parseInt(document.getElementById("bufferSize").value, 10) || 0;
    const router = document.getElementById("router").value;
    const msgTtl = document.getElementById("msgTtl").value || "infinite";
    const activeTimeStart1 = document.getElementById("activeTimeStart1").value;

    // Construct the new group object
    const newGroup = {
        groupID: groupID,
        numHosts: numHosts,
        movementModel: movementModel || "ShortestPathMapBasedMovement",
        routeType: movementRouteType,
        router: router,
        activeTimes: activeTimeStart1,
        messageTTL: msgTtl,
        actions: "Edit/Delete", // Default action text
    };

    // Add the new group to the groupSettings array
    groupSettings.push(newGroup);

    // Repopulate the group table to include the new group
    populateGroupTable();

    // Reset the form for a new entry
    document.getElementById("newGroupForm").reset();
});

// Function to edit group settings (as an example)
function editGroupSetting(group) {
    // Here you can prompt for new values or open a modal to edit group settings
    const newNumHosts = prompt(`Edit Number of Hosts for Group ${group.groupID}`, group.numHosts);
    const newMovementModel = prompt(`Edit Movement Model for Group ${group.groupID}`, group.movementModel);
    const newRouter = prompt(`Edit Router for Group ${group.groupID}`, group.router);
    const newActiveTimes = prompt(`Edit Active Times for Group ${group.groupID}`, group.activeTimes);
    const newMessageTTL = prompt(`Edit Message TTL for Group ${group.groupID}`, group.messageTTL);

    if (newNumHosts && newMovementModel && newRouter && newActiveTimes && newMessageTTL) {
        group.numHosts = newNumHosts;
        group.movementModel = newMovementModel;
        group.router = newRouter;
        group.activeTimes = newActiveTimes;
        group.messageTTL = newMessageTTL;
    }
    populateGroupTable();  // Update the table with new values
}

// Call the functions to populate tables when the page loads
document.addEventListener("DOMContentLoaded", function () {
    populateInterfaceTable();  // Populate the Interface settings table
    populateGroupTable();      // Populate the Groups settings table

    // Initialize Tagify for interface multi-select
    initInterfaceTagify();

    // Energy model toggle
    const energyToggle = document.getElementById('enableEnergyModel');
    if (energyToggle) {
        energyToggle.addEventListener('change', function () {
            document.getElementById('energyFields').style.display = this.checked ? 'block' : 'none';
        });
    }

    // POI configuration toggle
    const poiToggle = document.getElementById('poiEnabled');
    if (poiToggle) {
        poiToggle.addEventListener('change', function () {
            document.getElementById('poiConfiguration').style.display = this.checked ? 'block' : 'none';
        });
    }

    // ============================================================================
    // BATCH PREVIEW UPDATE LISTENERS
    // ============================================================================

    // Fields that affect batch count
    const batchFields = ['commonTtl', 'commonBufferSize', 'rngSeed'];
    batchFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateBatchPreview);
            field.addEventListener('change', updateBatchPreview);
        }
    });

    // Router Tagify needs special handling - wait for it to be initialized in settings.html
    setTimeout(() => {
        // Use the global routerTagify instance set by settings.html
        if (window.routerTagify) {
            window.routerTagify.on('add', updateBatchPreview);
            window.routerTagify.on('remove', updateBatchPreview);
            console.log('Router Tagify events attached');
        }
        // Initial update
        updateBatchPreview();
    }, 1500);

});


// Interface Tagify for multi-select
let interfaceTagify = null;

function initInterfaceTagify() {
    const interfaceInput = document.getElementById('commonInterface');
    if (!interfaceInput) return;

    // Get available interfaces from the interface table
    const availableInterfaces = getAvailableInterfaces();

    interfaceTagify = new Tagify(interfaceInput, {
        whitelist: availableInterfaces,
        enforceWhitelist: false,
        dropdown: {
            maxItems: 10,
            enabled: 0,
            closeOnSelect: false
        }
    });
}

function getAvailableInterfaces() {
    const interfaces = [];
    const tableRows = document.getElementById("interfaceList")?.getElementsByTagName("tbody")[0]?.rows;
    if (tableRows) {
        for (let row of tableRows) {
            interfaces.push(row.cells[0].innerText);
        }
    }
    // Add default if empty
    if (interfaces.length === 0) {
        interfaces.push('btInterface', 'highspeedInterface');
    }
    return interfaces;
}

// Update interface Tagify whitelist when interfaces are added/removed
function updateInterfaceTagifyWhitelist() {
    if (interfaceTagify) {
        interfaceTagify.settings.whitelist = getAvailableInterfaces();
    }
}

// POI Management Functions
function addPOIRow(index = '', probability = '') {
    const tbody = document.getElementById('poiTableBody');
    if (!tbody) return;

    const row = tbody.insertRow();
    row.innerHTML = `
        <td>
            <input type="number" data-field="index" value="${index}" min="1" onchange="updatePOIPreview()">
        </td>
        <td>
            <input type="number" data-field="probability" value="${probability}" min="0" max="1" step="0.1" onchange="updatePOIPreview()">
        </td>
        <td>
            <button type="button" class="remove-button" onclick="removePOIRow(this)">Remove</button>
        </td>
    `;
    updatePOIPreview();
}

function removePOIRow(btn) {
    btn.closest('tr').remove();
    updatePOIPreview();
}

function updatePOIPreview() {
    const rows = document.querySelectorAll('#poiTableBody tr');
    const pairs = [];
    rows.forEach(row => {
        const indexInput = row.querySelector('input[data-field="index"]');
        const probInput = row.querySelector('input[data-field="probability"]');
        if (indexInput && probInput) {
            const index = indexInput.value;
            const prob = probInput.value;
            if (index && prob) {
                pairs.push(`${index}, ${prob}`);
            }
        }
    });
    const preview = document.getElementById('poiPreview');
    if (preview) {
        preview.value = pairs.join(', ');
    }
}

// ONE Config Import Functions
function importONEConfig() {
    const fileInput = document.getElementById('importConfigFile');
    const statusSpan = document.getElementById('importStatus');

    if (!fileInput || !fileInput.files[0]) {
        alert('Please select a file to import');
        return;
    }

    const file = fileInput.files[0];
    if (statusSpan) statusSpan.textContent = 'Importing...';

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const content = e.target.result;
            const config = parseONEConfig(content);
            applyConfigToForm(config);
            if (statusSpan) statusSpan.textContent = 'Import successful!';
            statusSpan.style.color = '#10b981';
        } catch (error) {
            console.error('Import error:', error);
            if (statusSpan) statusSpan.textContent = 'Import failed: ' + error.message;
            statusSpan.style.color = '#ef4444';
        }
    };
    reader.onerror = function () {
        if (statusSpan) statusSpan.textContent = 'Error reading file';
        statusSpan.style.color = '#ef4444';
    };
    reader.readAsText(file);
}

function parseONEConfig(content) {
    const lines = content.split('\n');
    const config = {};

    lines.forEach(line => {
        line = line.trim();
        // Skip comments and empty lines
        if (!line || line.startsWith('#')) return;

        const match = line.match(/^([^=]+)\s*=\s*(.+)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();

            // Handle batch values [val1; val2; ...]
            if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(';').map(v => v.trim());
            }

            config[key] = value;
        }
    });

    return config;
}

function applyConfigToForm(config) {
    // Scenario settings
    if (config['Scenario.name']) {
        // Remove dynamic placeholders like %%Group.router%%
        let name = config['Scenario.name'].toString().replace(/_%%.+%%/g, '');
        document.getElementById('scenarioName').value = name;
    }
    if (config['Scenario.updateInterval']) {
        document.getElementById('updateInterval').value = config['Scenario.updateInterval'];
    }
    if (config['Scenario.endTime']) {
        document.getElementById('endTime').value = config['Scenario.endTime'];
    }
    if (config['Scenario.simulateConnections']) {
        document.getElementById('simulateConnections').checked = config['Scenario.simulateConnections'] === 'true';
    }

    // Movement settings
    if (config['MovementModel.rngSeed']) {
        const seed = Array.isArray(config['MovementModel.rngSeed'])
            ? config['MovementModel.rngSeed'].join('; ')
            : config['MovementModel.rngSeed'];
        document.getElementById('rngSeed').value = seed;
    }
    if (config['MovementModel.worldSize']) {
        document.getElementById('worldSize').value = config['MovementModel.worldSize'];
    }
    if (config['MovementModel.warmup']) {
        document.getElementById('warmup').value = config['MovementModel.warmup'];
    }

    // Group settings - handle router import with Tagify
    if (config['Group.router']) {
        let routers = config['Group.router'];
        // Parse router value - could be array or string like "[EpidemicRouter; ProphetRouter]"
        if (typeof routers === 'string') {
            routers = routers.replace(/[\[\]]/g, '').split(';').map(r => r.trim()).filter(r => r);
        }
        // Update the Tagify component
        if (window.routerTagify && routers.length > 0) {
            window.routerTagify.removeAllTags();
            window.routerTagify.addTags(routers);
        }
    }

    // Handle buffer size - support semicolon-separated batch values
    if (config['Group.bufferSize']) {
        let bufferSize = config['Group.bufferSize'];
        if (Array.isArray(bufferSize)) {
            bufferSize = bufferSize.join('; ');
        } else if (typeof bufferSize === 'string') {
            // Clean up brackets and normalize separators
            bufferSize = bufferSize.replace(/[\[\]]/g, '').trim();
            // Convert comma-separated to semicolon-separated if needed
            if (bufferSize.includes(',') && !bufferSize.includes(';')) {
                bufferSize = bufferSize.split(',').map(s => s.trim()).join('; ');
            }
        }
        document.getElementById('commonBufferSize').value = bufferSize;
    }
    if (config['Group.waitTime']) {
        document.getElementById('commonWaitTime').value = config['Group.waitTime'];
    }
    if (config['Group.speed']) {
        document.getElementById('commonSpeed').value = config['Group.speed'];
    }
    if (config['Group.msgTtl']) {
        const ttl = Array.isArray(config['Group.msgTtl'])
            ? config['Group.msgTtl'].join('; ')
            : config['Group.msgTtl'];
        document.getElementById('commonTtl').value = ttl;
    }
    if (config['Group.nrofHosts']) {
        document.getElementById('commonNumberOfHost').value = config['Group.nrofHosts'];
    }

    // Energy settings
    if (config['Group.initialEnergy']) {
        const energyToggle = document.getElementById('enableEnergyModel');
        if (energyToggle) {
            energyToggle.checked = true;
            document.getElementById('energyFields').style.display = 'block';
        }
        document.getElementById('initialEnergy').value = config['Group.initialEnergy'];
    }
    if (config['Group.scanEnergy']) {
        document.getElementById('scanEnergy').value = config['Group.scanEnergy'];
    }
    if (config['Group.transmitEnergy']) {
        document.getElementById('transmitEnergy').value = config['Group.transmitEnergy'];
    }
    if (config['Group.baseEnergy']) {
        document.getElementById('baseEnergy').value = config['Group.baseEnergy'];
    }

    // POI settings
    if (config['Group.pois']) {
        const poiToggle = document.getElementById('poiEnabled');
        if (poiToggle) {
            poiToggle.checked = true;
            document.getElementById('poiConfiguration').style.display = 'block';
        }
        // Parse POI string: index1, prob1, index2, prob2...
        const poiString = config['Group.pois'].toString();
        const poiParts = poiString.split(',').map(p => p.trim());
        // Clear existing POI rows
        document.getElementById('poiTableBody').innerHTML = '';
        // Add rows for each pair
        for (let i = 0; i < poiParts.length - 1; i += 2) {
            addPOIRow(poiParts[i], poiParts[i + 1]);
        }
    }

    // Router settings
    if (config['ProphetRouter.secondsInTimeUnit']) {
        document.getElementById('prophetRouterTimeUnit').value = config['ProphetRouter.secondsInTimeUnit'];
    }
    if (config['SprayAndWaitRouter.nrofCopies']) {
        document.getElementById('sprayAndWaitCopies').value = config['SprayAndWaitRouter.nrofCopies'];
    }
    if (config['SprayAndWaitRouter.binaryMode']) {
        document.getElementById('sprayAndWaitBinaryMode').checked = config['SprayAndWaitRouter.binaryMode'] === 'true';
    }

    // Optimization settings
    if (config['Optimization.cellSizeMult']) {
        document.getElementById('optimizationCellSizeMult').value = config['Optimization.cellSizeMult'];
    }
    if (config['Optimization.randomizeUpdateOrder']) {
        document.getElementById('optimizationRandomizeUpdateOrder').checked = config['Optimization.randomizeUpdateOrder'] === 'true';
    }

    alert('Configuration imported successfully! Review the settings before saving.');

    // Update batch preview to reflect imported values
    setTimeout(() => {
        if (typeof updateBatchPreview === 'function') {
            updateBatchPreview();
        }
    }, 100);
}


// Movement function
let fileList = ['shops.wkt', 'pedestrian_paths.wkt', 'main_roads.wkt', 'roads.wkt'];

// Initially display predefined files
const fileListContainer = document.getElementById('fileList');
fileList.forEach(file => {
    const listItem = document.createElement('li');
    listItem.textContent = file; // Display the predefined file names
    fileListContainer.appendChild(listItem);
});

// Event listener for file selection
document.getElementById("mapFiles").addEventListener("change", function (event) {
    let fileList = document.getElementById("fileList"); // Get the existing map file list
    let files = event.target.files; // Get the selected files

    // Loop through the selected files and add them to the list
    for (let i = 0; i < files.length; i++) {
        let fileName = files[i].name;

        // Check if the file is already in the list
        const existingItems = Array.from(fileList.children).map((item) => item.textContent);
        if (!existingItems.includes(fileName)) {
            const listItem = document.createElement("li");
            listItem.textContent = fileName;
            fileList.appendChild(listItem); // Append the new file to the list
        }
    }

    // Clear the file input value to allow re-selection of the same file
    event.target.value = "";
});


// Report making functions
const reportList = document.getElementById('reportList').getElementsByTagName('tbody')[0];
const reportClassInput = document.getElementById('reportClass');
const reportDirInput = document.getElementById('reportDir'); // Access the input element directly
const reportWarmupInput = document.getElementById('reportWarmup'); // Added for global warmup input
const browseDirButton = document.getElementById('browseDirButton');
const addReportButton = document.getElementById('addReportButton');
let reportWarmup = 0; // Global warmup time
let reportDirectory = "reports/"; // Global directory for reports
const reports = []; // Array to store report classes

// Function to render reports in the table
const renderReports = () => {
    reportList.innerHTML = ''; // Clear the table body
    reports.forEach((reportClass, index) => {
        const row = reportList.insertRow();
        row.innerHTML = `
                    <td>${reportClass}</td>
                    <td>
                        <button class="remove-button" onclick="removeReport(${index})">Remove</button>
                    </td>
                `;
    });
};

// Function to add a new report
const addReport = () => {
    const reportClass = reportClassInput.value.trim();

    // Validate input
    if (!reportClass) {
        alert("Please select a valid report class.");
        return;
    }

    // Check for duplicate report class
    if (reports.includes(reportClass)) {
        alert("This report class is already added.");
        return;
    }

    // Add the new report class to the reports array
    reports.push(reportClass);

    // Re-render the table
    renderReports();
};

// Function to remove a report
const removeReport = (index) => {
    reports.splice(index, 1); // Remove the selected report
    renderReports(); // Re-render the table
};

// Event listener for the "Browse" button
browseDirButton.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.webkitdirectory = true; // Allow directory selection
    fileInput.addEventListener("change", (event) => {
        if (event.target.files.length > 0) {
            // Extract the directory path from the selected file
            const directoryPath = event.target.files[0].webkitRelativePath.split("/")[0];
            reportDirInput.value = directoryPath + "/"; // Update the input field
            reportDirectory = directoryPath + "/"; // Update the global directory variable
            alert(`Report Directory set to: ${reportDirectory}`);
        } else {
            alert("No directory selected.");
        }
    });
    fileInput.click();
});

// Event listener for the "Add Report" button
addReportButton.addEventListener("click", addReport);

// Event listener for the global warmup input
reportWarmupInput.addEventListener("change", (event) => {
    reportWarmup = parseInt(event.target.value, 10) || 0; // Update the global warmup time
});

// Example: Preload default reports
reports.push("ContactTimesReport");
reports.push("MessageStatsReport");
renderReports();


// Function to run ONE


// Function to handle tab switching
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}
let batchNum;
// Function to generate and download the settings file based on the tab
function saveAllSettings() {
    console.log("Download Settings triggered");
    let content = '';

    // Collect all tabs' data
    // Scenario Tab
    let name = document.getElementById("scenarioName").value;
    var currentDate = new Date();

    // Extract the components of the current date and time
    var year = currentDate.getFullYear();
    var month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    var day = String(currentDate.getDate()).padStart(2, '0');
    var hours = String(currentDate.getHours()).padStart(2, '0');
    var minutes = String(currentDate.getMinutes()).padStart(2, '0');
    var seconds = String(currentDate.getSeconds()).padStart(2, '0');

    // Format the date and time
    var formattedDateTime = `${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;

    if (document.getElementById("nameAdd").checked) {
        name += '_' + formattedDateTime;
    }
    content += `
## Scenario settings
Scenario.name = ${name}_%%Group.router%%_%%MovementModel.rngSeed%%_%%Group.msgTtl%%

Scenario.simulateConnections = ${document.getElementById("simulateConnections").checked ? "true" : "false"}
Scenario.updateInterval = ${document.getElementById("updateInterval").value}
Scenario.endTime = ${document.getElementById("endTime").value}
    `;


    // Now for the Interface and Group Tables
    // Collecting Interface Table Data
    content += `
## Interface List Settings:
`;
    let TTLLen = 1;
    const interfaceTableRows = document.getElementById("interfaceList").getElementsByTagName("tbody")[0].rows;
    for (let row of interfaceTableRows) {
        const interfaceName = row.cells[0].innerText;
        const interfaceType = row.cells[1].innerText;
        const transmitSpeed = row.cells[2].innerText;
        const transmitRange = row.cells[3].innerText;

        content += `
#${interfaceName}.name = ${interfaceName}
${interfaceName}.type = ${interfaceType}
${interfaceName}.transmitSpeed = ${transmitSpeed}
${interfaceName}.transmitRange = ${transmitRange}
        `;
    }
    // Extract values from the form
    //  document.getElementById("commonGroupSettingsForm").addEventListener("submit", function (event) {
    //     event.preventDefault(); // Prevent the default form submission

    // Extract values from the form
    const CommoNmovementModel = document.getElementById("commonMovementModel").value;
    const tagifyInput = document.getElementById("commonRouter");
    const tagifyValue = JSON.parse(tagifyInput.value); // Parse the JSON-like string

    // Convert to the desired format
    const CommoNrouter = `[${tagifyValue.map(tag => tag.value).join("; ")}]`;
    const routerCount = tagifyValue.length;

    // Handle buffer size - support multiple values like "5M; 10M; 20M"
    let CommoNbufferSize = document.getElementById("commonBufferSize").value;
    let bufferLen = 1;
    if (CommoNbufferSize.includes(";")) {
        CommoNbufferSize = `[${CommoNbufferSize}]`;
        bufferLen = ((CommoNbufferSize.match(/;/g) || []).length) + 1;
    }
    const commonRouteFile = document.getElementById("commonRouteFile");
    const CommoNwaitTime = document.getElementById("commonWaitTime").value;

    // Handle multi-interface selection from Tagify
    let interfaces = ['btInterface']; // default
    const interfaceInput = document.getElementById("commonInterface");
    if (interfaceInput && interfaceInput.value) {
        try {
            const interfaceTagifyValue = JSON.parse(interfaceInput.value);
            if (Array.isArray(interfaceTagifyValue) && interfaceTagifyValue.length > 0) {
                interfaces = interfaceTagifyValue.map(tag => tag.value);
            }
        } catch (e) {
            // If not JSON, use the raw value
            interfaces = [interfaceInput.value];
        }
    }

    const CommoNspeed = document.getElementById("commonSpeed").value;
    let CommoNmsgTtl = document.getElementById("commonTtl").value;
    const CommoNnumHosts = document.getElementById("commonNumberOfHost").value;

    if (CommoNmsgTtl.includes(";")) {
        CommoNmsgTtl = `[${CommoNmsgTtl}]`;

    } else if (CommoNmsgTtl.includes(",") || CommoNmsgTtl.includes(" ")) {
        alert("Message TTL should be a list of integers separated by semicolon and space. For example: 1; 2; 3; 4; 5");
    }

    TTLLen = ((CommoNmsgTtl.match(/;/g) || []).length) + 1;

    content += `
Scenario.nrofHostGroups = ${document.getElementById("groupList").getElementsByTagName("tbody")[0].rows.length}
        `;
    // Collecting Common group Data
    content += `
## Common settings for all groups:
Group.movementModel = ${CommoNmovementModel}
Group.router = ${CommoNrouter}
Group.bufferSize = ${CommoNbufferSize}`
    if (commonRouteFile.value != '') {
        content += `
Group.routeFile = ${commonRouteFile.value}
   `
    }

    // Interface settings - handle multiple interfaces
    content += `
Group.waitTime =${CommoNwaitTime}
# Interface settings
Group.nrofInterfaces = ${interfaces.length}`;
    interfaces.forEach((iface, idx) => {
        content += `
Group.interface${idx + 1} = ${iface}`;
    });

    content += `
Group.speed = ${CommoNspeed}
# Message TTL of 300 minutes (5 hours)
Group.msgTtl = ${CommoNmsgTtl}
Group.nrofHosts = ${CommoNnumHosts}
`;

    // Energy Model Settings (only if enabled)
    const energyEnabled = document.getElementById('enableEnergyModel')?.checked;
    if (energyEnabled) {
        const initialEnergy = document.getElementById('initialEnergy')?.value || '100';
        const scanEnergy = document.getElementById('scanEnergy')?.value || '0.1';
        const transmitEnergy = document.getElementById('transmitEnergy')?.value || '0.001';
        const baseEnergy = document.getElementById('baseEnergy')?.value || '0.01';

        content += `
## Energy model settings
Group.initialEnergy = ${initialEnergy}
Group.scanEnergy = ${scanEnergy}
Group.transmitEnergy = ${transmitEnergy}
Group.baseEnergy = ${baseEnergy}
`;
    }

    // POI Settings (only if enabled)
    const poiEnabled = document.getElementById('poiEnabled')?.checked;
    if (poiEnabled) {
        const poiString = document.getElementById('poiPreview')?.value;
        if (poiString && poiString.trim()) {
            content += `
## Points of Interest
Group.pois = ${poiString}
`;
        }
    }
    // });
    // Collecting Group Table Data
    const groupTableRows = document.getElementById("groupList").getElementsByTagName("tbody")[0].rows;
    let serial = 1;
    for (let row of groupTableRows) {
        const groupID = row.cells[0].innerText;
        const numHosts = row.cells[1].innerText;
        const movementModel = row.cells[2].innerText;
        const route = row.cells[3].innerText;
        const routeType = row.cells[4].innerText;
        const router = row.cells[5].innerText;
        const activeTimes = row.cells[6].innerText;
        const messageTTL = row.cells[7].innerText;

        content += `
Group${serial}.groupID = ${groupID}
Group${serial}.numHosts = ${numHosts}
Group${serial}.movementModel = ${movementModel}
`
        if (route != '') {
            content += `
Group${serial}.routeFile = ${route}
`
        }

        content += `
Group${serial}.router = ${router}
`
        if (routeType) {
            content += `
Group${serial}.routeType = ${routeType}
`
        }
        content += `
Group${serial}.messageTTL = ${messageTTL}
`
        if (activeTimes != '0') {
            content += `
 Group${serial}.activeTimes = ${activeTimes}
 
 `;
        }

        serial++;
    }
    // Event
    content += `
## Event settings
Events.nrof = ${events.length}`
    let count = 1;
    for (let row of events) {

        content += `
Events${count}.class = ${row['eventClass']}
Events${count}.interval =${row['interval']}
Events${count}.size =${row['size']}
Events${count}.hosts = ${row['hosts']}
Events${count}.prefix = ${row['prefix']}
    `;
        count++;
    }

    // Collect RNG Seed
    let rngSeed = document.getElementById("rngSeed").value || "1";
    if (rngSeed.includes(";")) {
        rngSeed = `[${rngSeed}]`;

    } else if (rngSeed.includes(",") || rngSeed.includes(" ")) {
        alert("RNG Seed should be a list of integers separated by semicolon and space. For example: 1; 2; 3; 4; 5");
    }

    let rngSeedLen = ((rngSeed.match(/;/g) || []).length) + 1;

    // Calculate total batch runs: routers × seeds × TTLs × buffers
    batchNum = routerCount * rngSeedLen * TTLLen * bufferLen;
    console.log(`Batch calculation: ${routerCount} routers × ${rngSeedLen} seeds × ${TTLLen} TTLs × ${bufferLen} buffers = ${batchNum} runs`);
    content += `
## Movement model settings
# seed for movement models' pseudo random number generator (default = 0)
MovementModel.rngSeed = ${rngSeed}
`;

    // Collect World Size and Warmup Time
    const worldSize = document.getElementById("worldSize").value || "4500, 3400";
    const warmupTime = document.getElementById("warmup").value || "1000";
    content += `
# World's size for Movement Models without implicit size (width, height; meters)
MovementModel.worldSize = ${worldSize}
# How long time to move hosts in the world before real simulation
MovementModel.warmup = ${warmupTime}
`;

    // Collect Map Files
    const fileList = document.getElementById("fileList").children;
    content += `
## Map based movement -movement model specific settings
MapBasedMovement.nrofMapFiles = ${fileList.length}
`;
    if (fileList.length > 0) {
        let mapFileIndex = 1;
        for (let fileItem of fileList) {
            const fileName = fileItem.textContent.trim();
            content += `MapBasedMovement.mapFile${mapFileIndex} = data/${fileName}\n`;
            mapFileIndex++;
        }
    } else {
        content += "# No map files selected\n";
    }
    content += `

# how many reports to load
Report.nrofReports = ${reports.length}
# length of the warm up period (simulated seconds)
Report.warmup = ${reportWarmup}
# default directory of reports (can be overridden per Report with output setting)
Report.reportDir = ${reportDirectory}
`;

    // Add each report class
    reports.forEach((reportClass, index) => {
        content += `Report.report${index + 1} = ${reportClass}\n`;
    });
    //Router&Optimization Tab
    // Retrieve values from the form
    const prophetRouterTimeUnit = document.getElementById('prophetRouterTimeUnit').value;
    const sprayAndWaitCopies = document.getElementById('sprayAndWaitCopies').value;
    const sprayAndWaitBinaryMode = document.getElementById('sprayAndWaitBinaryMode').checked;
    const optimizationCellSizeMult = document.getElementById('optimizationCellSizeMult').value;
    const optimizationRandomizeUpdateOrder = document.getElementById('optimizationRandomizeUpdateOrder').checked;

    content += `
## Default settings for some routers settings
ProphetRouter.secondsInTimeUnit = ${prophetRouterTimeUnit}
SprayAndWaitRouter.nrofCopies = ${sprayAndWaitCopies}
SprayAndWaitRouter.binaryMode = ${sprayAndWaitBinaryMode}

## Optimization settings -- these affect the speed of the simulation
## see World class for details.
Optimization.cellSizeMult = ${optimizationCellSizeMult}
Optimization.randomizeUpdateOrder = ${optimizationRandomizeUpdateOrder}
        `;

    // GUI Tab

    const underlayImageOffset = document.getElementById('underlayImageOffset').value;
    const underlayImageScale = document.getElementById('underlayImageScale').value;
    const underlayImageRotate = document.getElementById('underlayImageRotate').value;
    const eventLogPanelNrofEvents = document.getElementById('eventLogPanelNrofEvents').value;
    const fileInput = document.getElementById('underlayImageFileName');
    let file = 'helsinki_underlay.png';
    if (fileInput.value) {

        file = fileInput.files[0].name;

    }

    content += `
## GUI settings

# GUI underlay image settings
GUI.UnderlayImage.fileName = ${'data/' + file}
# Image offset in pixels (x, y)
GUI.UnderlayImage.offset = ${underlayImageOffset}
# Scaling factor for the image
GUI.UnderlayImage.scale = ${underlayImageScale}
# Image rotation (radians)
GUI.UnderlayImage.rotate = ${underlayImageRotate}

# how many events to show in the log panel (default = 30)
GUI.EventLogPanel.nrofEvents = ${eventLogPanelNrofEvents}
# Regular Expression log filter (see Pattern-class from the Java API for RE-matching details)
#GUI.EventLogPanel.REfilter = .*p[1-9]<->p[1-9]$
    `;



    // Get the settings filename
    let settingsFilename = name + '_settings.txt';
    if (document.getElementById("nameAdd").checked) {
        settingsFilename = name + '_settings.txt';
    }

    // Build the payload with simulation settings AND post-processing configs
    const payload = {
        settings: {
            filename: settingsFilename,
            content: content
        }
    };

    // Collect post-processing configs from the forms
    // Analysis config
    payload.analysis = collectAnalysisConfig();

    // Batch config  
    payload.batch = collectBatchConfig();

    // Regression config
    payload.regression = collectRegressionConfig();

    // Send to server to save all at once
    fetch('/api/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('All settings saved successfully!\n\n' +
                    'Simulation: ' + (data.results.settings_file || 'Not saved') + '\n' +
                    'Configs: ' + Object.keys(data.results.configs || {}).join(', '));
            } else {
                alert('Error saving settings: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save settings to server');
        });
}

// Helper functions to collect post-processing config data from forms
function collectAnalysisConfig() {
    // Collect metrics from Tagify or fallback to input values
    let metricsInclude = [];
    let metricsIgnore = [];
    let enabledPlots = {};

    if (typeof metricsIncludeTagify !== 'undefined' && metricsIncludeTagify?.value) {
        metricsInclude = metricsIncludeTagify.value.map(t => t.value);
    }
    if (typeof metricsIgnoreTagify !== 'undefined' && metricsIgnoreTagify?.value) {
        metricsIgnore = metricsIgnoreTagify.value.map(t => t.value);
    }

    // Collect enabled plots from Tagify
    if (typeof enabledPlotsTagify !== 'undefined' && enabledPlotsTagify?.value) {
        // Default all to false
        ['line_plots', '3d_surface', 'violin_plots', 'heatmaps', 'pairplot', 'export_csv'].forEach(plot => {
            enabledPlots[plot] = false;
        });
        // Enable selected ones
        enabledPlotsTagify.value.forEach(t => {
            enabledPlots[t.value] = true;
        });
    } else {
        // Fallback to defaults
        enabledPlots = {
            line_plots: true,
            '3d_surface': true,
            violin_plots: true,
            heatmaps: true,
            pairplot: true,
            export_csv: true
        };
    }

    // Collect report types from Tagify
    let reportTypes = [];
    if (typeof reportTypesTagify !== 'undefined' && reportTypesTagify?.value) {
        reportTypes = reportTypesTagify.value.map(t => t.value);
    }

    // Collect dynamic grouping labels
    const groupingLabels = {};
    const labelRows = document.querySelectorAll('#analysisGroupingLabelsBody tr');
    labelRows.forEach(row => {
        const typeInput = row.querySelector('input[data-field="type"]');
        const labelInput = row.querySelector('input[data-field="label"]');
        if (typeInput && labelInput && typeInput.value.trim()) {
            groupingLabels[typeInput.value.trim()] = labelInput.value || '';
        }
    });

    return {
        directories: {
            report_dir: document.getElementById('analysisReportDir')?.value || 'reportQP',
            plots_dir: document.getElementById('analysisPlotsDir')?.value || 'plots'
        },
        data_separator: document.getElementById('analysisDataSeparator')?.value || ':',
        file_patterns: {
            report_extension: document.getElementById('analysisReportExtension')?.value || '.txt'
        },
        report_types: reportTypes.length > 0 ? reportTypes : ['MessageStatsReport'],
        filename_structure: {
            delimiter: document.getElementById('analysisFilenameDelimiter')?.value || '_',
            average_files: {
                report_type_position: parseInt(document.getElementById('analysisReportTypePos')?.value) || 0,
                router_position: parseInt(document.getElementById('analysisRouterPos')?.value) || 1,
                grouping_type_position: parseInt(document.getElementById('analysisGroupingTypePos')?.value) || -1
            }
        },
        grouping_labels: groupingLabels,
        metrics: {
            include: metricsInclude,
            ignore: metricsIgnore
        },
        plot_thresholds: {
            min_values_for_line: parseInt(document.getElementById('analysisMinValuesLine')?.value) || 2,
            min_values_for_surface: parseInt(document.getElementById('analysisMinValuesSurface')?.value) || 3,
            min_files_for_heatmap: parseInt(document.getElementById('analysisMinFilesHeatmap')?.value) || 2
        },
        enabled_plots: enabledPlots
    };
}

function collectBatchConfig() {
    // Collect ignore fields from Tagify
    let ignoreFields = [];
    if (typeof batchIgnoreFieldsTagify !== 'undefined' && batchIgnoreFieldsTagify?.value) {
        ignoreFields = batchIgnoreFieldsTagify.value.map(t => t.value);
    }

    // Collect dynamic filename pattern components
    const components = {};
    const componentRows = document.querySelectorAll('#batchComponentsBody tr');
    componentRows.forEach(row => {
        const nameInput = row.querySelector('input[data-field="name"]');
        const posInput = row.querySelector('input[data-field="position"]');
        if (nameInput && posInput && nameInput.value.trim()) {
            components[nameInput.value.trim()] = parseInt(posInput.value) || 0;
        }
    });

    // Collect dynamic average groups
    const averageGroups = [];
    const groupRows = document.querySelectorAll('#batchAverageGroupsBody tr');
    groupRows.forEach(row => {
        const nameInput = row.querySelector('input[data-field="name"]');
        const groupByInput = row.querySelector('input[data-field="groupBy"]');
        const minFilesInput = row.querySelector('input[data-field="minFiles"]');
        const outputTemplateInput = row.querySelector('input[data-field="outputTemplate"]');

        if (nameInput && groupByInput && nameInput.value.trim()) {
            const groupByStr = groupByInput.value.trim();
            const groupByArray = groupByStr ? groupByStr.split(',').map(s => s.trim()).filter(s => s) : [];

            averageGroups.push({
                name: nameInput.value.trim(),
                group_by: groupByArray,
                min_files: parseInt(minFilesInput?.value) || 2,
                output_template: outputTemplateInput?.value || ''
            });
        }
    });

    return {
        folder: document.getElementById('batchFolder')?.value || 'reportQP',
        file_filter: {
            extension: document.getElementById('batchExtension')?.value || '.txt'
        },
        filename_pattern: {
            delimiter: document.getElementById('batchDelimiter')?.value || '_',
            components: components
        },
        data_separator: document.getElementById('batchDataSeparator')?.value || ':',
        ignore_fields: ignoreFields.length > 0 ? ignoreFields : ['sim_time'],
        average_groups: averageGroups,
        output: {
            precision: parseInt(document.getElementById('batchPrecision')?.value) || 4
        }
    };
}

function collectRegressionConfig() {
    // Collect predictors from Tagify
    let predictors = [];
    if (typeof predictorsTagify !== 'undefined' && predictorsTagify?.value) {
        predictors = predictorsTagify.value.map(t => t.value);
    }

    // Collect exclude variables from Tagify
    let excludeVars = [];
    if (typeof regressionExcludeTagify !== 'undefined' && regressionExcludeTagify?.value) {
        excludeVars = regressionExcludeTagify.value.map(t => t.value);
    }

    // Collect enabled models from Tagify
    let enabledModels = {};
    if (typeof enabledModelsTagify !== 'undefined' && enabledModelsTagify?.value) {
        // Default all to false
        ['Linear Regression', 'Ridge Regression', 'Lasso Regression', 'Decision Tree', 'Random Forest', 'Gradient Boosting', 'KNN'].forEach(model => {
            enabledModels[model] = false;
        });
        // Enable selected ones
        enabledModelsTagify.value.forEach(t => {
            enabledModels[t.value] = true;
        });
    } else {
        // Fallback to defaults
        enabledModels = {
            'Linear Regression': true,
            'Ridge Regression': false,
            'Lasso Regression': false,
            'Decision Tree': true,
            'Random Forest': true,
            'Gradient Boosting': true,
            'KNN': true
        };
    }

    return {
        input: {
            // Use the plots directory - that's where analysis.py outputs CSVs
            csv_directory: document.getElementById('analysisPlotsDir')?.value || 'plots/',
            mode: 'all',
            active_files: []
        },
        features: {
            target: document.getElementById('regressionTarget')?.value || 'delivery_prob',
            selection_mode: document.getElementById('regressionSelectionMode')?.value || 'manual',
            predictors: predictors,
            exclude: excludeVars.length > 0 ? excludeVars : ['seed', 'run_id'],
            normalize: document.getElementById('regressionNormalize')?.checked ?? true,
            polynomial_features: {
                enabled: document.getElementById('polyEnabled')?.checked ?? true,
                degree: parseInt(document.getElementById('polyDegree')?.value) || 2,
                interaction_only: document.getElementById('polyInteractionOnly')?.checked ?? true,
                include_bias: document.getElementById('polyIncludeBias')?.checked ?? false
            }
        },
        model_settings: {
            split_settings: {
                train_size: parseFloat(document.getElementById('regressionTrainSize')?.value) || 0.75,
                random_state: parseInt(document.getElementById('regressionRandomState')?.value) || 5
            },
            cross_validation: {
                enabled: document.getElementById('regressionCVEnabled')?.checked ?? true,
                folds: parseInt(document.getElementById('regressionCVFolds')?.value) || 5
            },
            enabled_models: enabledModels,
            parameters: {
                KNN: {
                    n_neighbors: parseInt(document.getElementById('knnNeighbors')?.value) || 6
                },
                'Decision Tree': {
                    max_depth: document.getElementById('dtMaxDepth')?.value ? parseInt(document.getElementById('dtMaxDepth').value) : null,
                    min_samples_split: 2
                },
                'Random Forest': {
                    n_estimators: parseInt(document.getElementById('rfEstimators')?.value) || 100,
                    max_depth: null
                },
                'Gradient Boosting': {
                    n_estimators: parseInt(document.getElementById('gbEstimators')?.value) || 100,
                    learning_rate: parseFloat(document.getElementById('gbLearningRate')?.value) || 0.1,
                    max_depth: parseInt(document.getElementById('gbMaxDepth')?.value) || 3
                }
            }
        },
        output: {
            directory: document.getElementById('regressionOutputDir')?.value || 'regression_results'
        }
    };
}


function saveDefaultSettings() {
    console.log("Download Settings triggered");
    let content = '';

    // Collect all tabs' data
    // Scenario Tab
    content += `
#
# Default settings for the simulation
#

## Scenario settings
Scenario.name = default_scenario
Scenario.simulateConnections = true
Scenario.updateInterval = 0.1
# 43200s == 12h
Scenario.endTime = 10000000
Scenario.endTime = 43200

## Interface-specific settings:
# type : which interface class the interface belongs to
# For different types, the sub-parameters are interface-specific
# For SimpleBroadcastInterface, the parameters are:
# transmitSpeed : transmit speed of the interface (bytes per second) 
# transmitRange : range of the interface (meters)

# "Bluetooth" interface for all nodes
btInterface.type = SimpleBroadcastInterface
# Transmit speed of 2 Mbps = 250kBps
btInterface.transmitSpeed = 250k
btInterface.transmitRange = 10

# High speed, long range, interface for group 4
highspeedInterface.type = SimpleBroadcastInterface
highspeedInterface.transmitSpeed = 10M
highspeedInterface.transmitRange = 10

# Define 6 different node groups
Scenario.nrofHostGroups = 6

## Group-specific settings:
# groupID : Group's identifier. Used as the prefix of host names
# nrofHosts: number of hosts in the group
# movementModel: movement model of the hosts (valid class name from movement package)
# waitTime: minimum and maximum wait times (seconds) after reaching destination
# speed: minimum and maximum speeds (m/s) when moving on a path
# bufferSize: size of the message buffer (bytes)
# router: router used to route messages (valid class name from routing package)
# activeTimes: Time intervals when the nodes in the group are active (start1, end1, start2, end2, ...)
# msgTtl : TTL (minutes) of the messages created by this host group, default=infinite

## Group and movement model specific settings
# pois: Points Of Interest indexes and probabilities (poiIndex1, poiProb1, poiIndex2, poiProb2, ... )
#       for ShortestPathMapBasedMovement
# okMaps : which map nodes are OK for the group (map file indexes), default=all 
#          for all MapBasedMovent models
# routeFile: route's file path - for MapRouteMovement
# routeType: route's type - for MapRouteMovement


# Common settings for all groups
Group.movementModel = ShortestPathMapBasedMovement
Group.router = EpidemicRouter
Group.bufferSize = 5M
Group.waitTime = 0, 120
# All nodes have the bluetooth interface
Group.nrofInterfaces = 1
Group.interface1 = btInterface
# Walking speeds
Group.speed = 0.5, 1.5
# Message TTL of 300 minutes (5 hours)
Group.msgTtl = 300

Group.nrofHosts = 40

# group1 (pedestrians) specific settings
Group1.groupID = p

# group2 specific settings
Group2.groupID = c
# cars can drive only on roads
Group2.okMaps = 1
# 10-50 km/h
Group2.speed = 2.7, 13.9

# another group of pedestrians
Group3.groupID = w

# The Tram groups
Group4.groupID = t
Group4.bufferSize = 50M
Group4.movementModel = MapRouteMovement
Group4.routeFile = data/tram3.wkt
Group4.routeType = 1
Group4.waitTime = 10, 30
Group4.speed = 7, 10
Group4.nrofHosts = 2
Group4.nrofInterfaces = 2
Group4.interface1 = btInterface
Group4.interface2 = highspeedInterface

Group5.groupID = t
Group5.bufferSize = 50M
Group5.movementModel = MapRouteMovement
Group5.routeFile = data/tram4.wkt
Group5.routeType = 2
Group5.waitTime = 10, 30
Group5.speed = 7, 10
Group5.nrofHosts = 2

Group6.groupID = t
Group6.bufferSize = 50M
Group6.movementModel = MapRouteMovement
Group6.routeFile = data/tram10.wkt
Group6.routeType = 2
Group6.waitTime = 10, 30
Group6.speed = 7, 10
Group6.nrofHosts = 2


## Message creation parameters 
# How many event generators
Events.nrof = 1
# Class of the first event generator
Events1.class = MessageEventGenerator
# (following settings are specific for the MessageEventGenerator class)
# Creation interval in seconds (one new message every 25 to 35 seconds)
Events1.interval = 25,35
# Message sizes (500kB - 1MB)
Events1.size = 500k,1M
# range of message source/destination addresses
Events1.hosts = 0,125
# Message ID prefix
Events1.prefix = M


## Movement model settings
# seed for movement models' pseudo random number generator (default = 0)
MovementModel.rngSeed = 1
# World's size for Movement Models without implicit size (width, height; meters)
MovementModel.worldSize = 4500, 3400
# How long time to move hosts in the world before real simulation
MovementModel.warmup = 1000

## Map based movement -movement model specific settings
MapBasedMovement.nrofMapFiles = 4

MapBasedMovement.mapFile1 = data/roads.wkt
MapBasedMovement.mapFile2 = data/main_roads.wkt
MapBasedMovement.mapFile3 = data/pedestrian_paths.wkt
MapBasedMovement.mapFile4 = data/shops.wkt

## Reports - all report names have to be valid report classes

# how many reports to load
Report.nrofReports = 2
# length of the warm up period (simulated seconds)
Report.warmup = 0
# default directory of reports (can be overridden per Report with output setting)
Report.reportDir = reports/
# Report classes to load
Report.report1 = ContactTimesReport
Report.report2 = ConnectivityONEReport

## Default settings for some routers settings
ProphetRouter.secondsInTimeUnit = 30
SprayAndWaitRouter.nrofCopies = 6
SprayAndWaitRouter.binaryMode = true

## Optimization settings -- these affect the speed of the simulation
## see World class for details.
Optimization.cellSizeMult = 5
Optimization.randomizeUpdateOrder = true


## GUI settings

# GUI underlay image settings
GUI.UnderlayImage.fileName = data/helsinki_underlay.png
# Image offset in pixels (x, y)
GUI.UnderlayImage.offset = 64, 20
# Scaling factor for the image
GUI.UnderlayImage.scale = 4.75
# Image rotation (radians)
GUI.UnderlayImage.rotate = -0.015

# how many events to show in the log panel (default = 30)
GUI.EventLogPanel.nrofEvents = 100
# Regular Expression log filter (see Pattern-class from the Java API for RE-matching details)
#GUI.EventLogPanel.REfilter = .*p[1-9]<->p[1-9]$
`;


    // Save to server instead of browser download
    fetch('/api/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: 'default_settings.txt',
            content: content
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Default settings saved to: ' + data.path);
            } else {
                alert('Error saving settings: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save default settings');
        });
}

function runONE() {
    // Auto-detect batch mode based on settings
    const routerInput = document.getElementById("commonRouter");
    let routerCount = 1;
    try {
        const routerTagifyValue = JSON.parse(routerInput?.value || '[]');
        routerCount = Array.isArray(routerTagifyValue) ? routerTagifyValue.length : 1;
    } catch (e) {
        routerCount = 1;
    }
    const ttlValue = document.getElementById('commonTtl')?.value || '';
    const bufferValue = document.getElementById('commonBufferSize')?.value || '';
    const seedValue = document.getElementById('rngSeed')?.value || '';

    // Enable batch mode if multiple routers or any field has semicolons
    const batchMode = (
        routerCount > 1 ||
        ttlValue.includes(';') ||
        bufferValue.includes(';') ||
        seedValue.includes(';')
    );

    const compile = document.getElementById("compile").checked;
    const enableML = document.getElementById("enableMachineLearning")?.checked || false;

    // ============================================================
    // STEP 1: Collect simulation settings (same as saveAllSettings)
    // ============================================================
    let content = '';

    // Scenario Tab
    let name = document.getElementById("scenarioName").value;
    var currentDate = new Date();
    var year = currentDate.getFullYear();
    var month = String(currentDate.getMonth() + 1).padStart(2, '0');
    var day = String(currentDate.getDate()).padStart(2, '0');
    var hours = String(currentDate.getHours()).padStart(2, '0');
    var minutes = String(currentDate.getMinutes()).padStart(2, '0');
    var seconds = String(currentDate.getSeconds()).padStart(2, '0');
    var formattedDateTime = `${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;

    if (document.getElementById("nameAdd").checked) {
        name += '_' + formattedDateTime;
    }
    content += `
## Scenario settings
Scenario.name = ${name}_%%Group.router%%_%%MovementModel.rngSeed%%_%%Group.msgTtl%%

Scenario.simulateConnections = ${document.getElementById("simulateConnections").checked ? "true" : "false"}
Scenario.updateInterval = ${document.getElementById("updateInterval").value}
Scenario.endTime = ${document.getElementById("endTime").value}
    `;

    // Interface Table Data
    content += `
## Interface List Settings:
`;
    let TTLLen = 1;
    const interfaceTableRows = document.getElementById("interfaceList").getElementsByTagName("tbody")[0].rows;
    for (let row of interfaceTableRows) {
        const interfaceName = row.cells[0].innerText;
        const interfaceType = row.cells[1].innerText;
        const transmitSpeed = row.cells[2].innerText;
        const transmitRange = row.cells[3].innerText;

        content += `
#${interfaceName}.name = ${interfaceName}
${interfaceName}.type = ${interfaceType}
${interfaceName}.transmitSpeed = ${transmitSpeed}
${interfaceName}.transmitRange = ${transmitRange}
        `;
    }

    // Common group settings
    const CommoNmovementModel = document.getElementById("commonMovementModel").value;
    const tagifyInput = document.getElementById("commonRouter");
    const tagifyValue = JSON.parse(tagifyInput.value);
    const CommoNrouter = `[${tagifyValue.map(tag => tag.value).join("; ")}]`;
    // routerCount already computed above for batch mode detection
    const CommoNbufferSize = document.getElementById("commonBufferSize").value;
    const commonRouteFile = document.getElementById("commonRouteFile");
    const CommoNwaitTime = document.getElementById("commonWaitTime").value;

    // Handle multi-interface selection
    let interfaces = ['btInterface'];
    const interfaceInput = document.getElementById("commonInterface");
    if (interfaceInput && interfaceInput.value) {
        try {
            const interfaceTagifyValue = JSON.parse(interfaceInput.value);
            if (Array.isArray(interfaceTagifyValue) && interfaceTagifyValue.length > 0) {
                interfaces = interfaceTagifyValue.map(tag => tag.value);
            }
        } catch (e) {
            interfaces = [interfaceInput.value];
        }
    }

    const CommoNspeed = document.getElementById("commonSpeed").value;
    let CommoNmsgTtl = document.getElementById("commonTtl").value;
    const CommoNnumHosts = document.getElementById("commonNumberOfHost").value;

    if (CommoNmsgTtl.includes(";")) {
        CommoNmsgTtl = `[${CommoNmsgTtl}]`;
    }
    TTLLen = ((CommoNmsgTtl.match(/;/g) || []).length) + 1;

    content += `
Scenario.nrofHostGroups = ${document.getElementById("groupList").getElementsByTagName("tbody")[0].rows.length}
        `;
    content += `
## Common settings for all groups:
Group.movementModel = ${CommoNmovementModel}
Group.router = ${CommoNrouter}
Group.bufferSize = ${CommoNbufferSize}`;
    if (commonRouteFile.value != '') {
        content += `
Group.routeFile = ${commonRouteFile.value}
   `
    }

    content += `
Group.waitTime =${CommoNwaitTime}
# Interface settings
Group.nrofInterfaces = ${interfaces.length}`;
    interfaces.forEach((iface, idx) => {
        content += `
Group.interface${idx + 1} = ${iface}`;
    });

    content += `
Group.speed = ${CommoNspeed}
# Message TTL of 300 minutes (5 hours)
Group.msgTtl = ${CommoNmsgTtl}
Group.nrofHosts = ${CommoNnumHosts}
`;

    // Energy Model Settings
    const energyEnabled = document.getElementById('enableEnergyModel')?.checked;
    if (energyEnabled) {
        const initialEnergy = document.getElementById('initialEnergy')?.value || '100';
        const scanEnergy = document.getElementById('scanEnergy')?.value || '0.1';
        const transmitEnergy = document.getElementById('transmitEnergy')?.value || '0.001';
        const baseEnergy = document.getElementById('baseEnergy')?.value || '0.01';
        content += `
## Energy model settings
Group.initialEnergy = ${initialEnergy}
Group.scanEnergy = ${scanEnergy}
Group.transmitEnergy = ${transmitEnergy}
Group.baseEnergy = ${baseEnergy}
`;
    }

    // POI Settings
    const poiEnabled = document.getElementById('poiEnabled')?.checked;
    if (poiEnabled) {
        const poiString = document.getElementById('poiPreview')?.value;
        if (poiString && poiString.trim()) {
            content += `
## Points of Interest
Group.pois = ${poiString}
`;
        }
    }

    // Group Table Data
    const groupTableRows = document.getElementById("groupList").getElementsByTagName("tbody")[0].rows;
    let serial = 1;
    for (let row of groupTableRows) {
        const groupID = row.cells[0].innerText;
        const numHosts = row.cells[1].innerText;
        const movementModel = row.cells[2].innerText;
        const route = row.cells[3].innerText;
        const routeType = row.cells[4].innerText;
        const router = row.cells[5].innerText;
        const activeTimes = row.cells[6].innerText;
        const messageTTL = row.cells[7].innerText;

        content += `
Group${serial}.groupID = ${groupID}
Group${serial}.numHosts = ${numHosts}
Group${serial}.movementModel = ${movementModel}
`
        if (route != '') {
            content += `
Group${serial}.routeFile = ${route}
`
        }

        content += `
Group${serial}.router = ${router}
`
        if (routeType) {
            content += `
Group${serial}.routeType = ${routeType}
`
        }
        content += `
Group${serial}.messageTTL = ${messageTTL}
`
        if (activeTimes != '0') {
            content += `
 Group${serial}.activeTimes = ${activeTimes}
 
 `;
        }
        serial++;
    }

    // Event settings
    content += `
## Event settings
Events.nrof = ${events.length}`
    let count = 1;
    for (let row of events) {
        content += `
Events${count}.class = ${row['eventClass']}
Events${count}.interval =${row['interval']}
Events${count}.size =${row['size']}
Events${count}.hosts = ${row['hosts']}
Events${count}.prefix = ${row['prefix']}
    `;
        count++;
    }

    // RNG Seed
    let rngSeed = document.getElementById("rngSeed").value || "1";
    if (rngSeed.includes(";")) {
        rngSeed = `[${rngSeed}]`;
    }
    let rngSeedLen = ((rngSeed.match(/;/g) || []).length) + 1;

    // Calculate batch number
    batchNum = routerCount * rngSeedLen * TTLLen;

    content += `
## Movement model settings
# seed for movement models' pseudo random number generator (default = 0)
MovementModel.rngSeed = ${rngSeed}
`;

    // World Size and Warmup Time
    const worldSize = document.getElementById("worldSize").value || "4500, 3400";
    const warmupTime = document.getElementById("warmup").value || "1000";
    content += `
# World's size for Movement Models without implicit size (width, height; meters)
MovementModel.worldSize = ${worldSize}
# How long time to move hosts in the world before real simulation
MovementModel.warmup = ${warmupTime}
`;

    // Map Files
    const fileList = document.getElementById("fileList").children;
    content += `
## Map based movement -movement model specific settings
MapBasedMovement.nrofMapFiles = ${fileList.length}
`;
    if (fileList.length > 0) {
        let mapFileIndex = 1;
        for (let fileItem of fileList) {
            const fileName = fileItem.textContent.trim();
            content += `MapBasedMovement.mapFile${mapFileIndex} = data/${fileName}\n`;
            mapFileIndex++;
        }
    } else {
        content += "# No map files selected\n";
    }

    // Reports
    content += `

# how many reports to load
Report.nrofReports = ${reports.length}
# length of the warm up period (simulated seconds)
Report.warmup = ${reportWarmup}
# default directory of reports (can be overridden per Report with output setting)
Report.reportDir = ${reportDirectory}
`;
    reports.forEach((reportClass, index) => {
        content += `Report.report${index + 1} = ${reportClass}\n`;
    });

    // Router & Optimization Tab
    const prophetRouterTimeUnit = document.getElementById('prophetRouterTimeUnit').value;
    const sprayAndWaitCopies = document.getElementById('sprayAndWaitCopies').value;
    const sprayAndWaitBinaryMode = document.getElementById('sprayAndWaitBinaryMode').checked;
    const optimizationCellSizeMult = document.getElementById('optimizationCellSizeMult').value;
    const optimizationRandomizeUpdateOrder = document.getElementById('optimizationRandomizeUpdateOrder').checked;

    content += `
## Default settings for some routers settings
ProphetRouter.secondsInTimeUnit = ${prophetRouterTimeUnit}
SprayAndWaitRouter.nrofCopies = ${sprayAndWaitCopies}
SprayAndWaitRouter.binaryMode = ${sprayAndWaitBinaryMode}

## Optimization settings -- these affect the speed of the simulation
## see World class for details.
Optimization.cellSizeMult = ${optimizationCellSizeMult}
Optimization.randomizeUpdateOrder = ${optimizationRandomizeUpdateOrder}
        `;

    // GUI Tab
    const underlayImageOffset = document.getElementById('underlayImageOffset').value;
    const underlayImageScale = document.getElementById('underlayImageScale').value;
    const underlayImageRotate = document.getElementById('underlayImageRotate').value;
    const eventLogPanelNrofEvents = document.getElementById('eventLogPanelNrofEvents').value;
    const fileInput = document.getElementById('underlayImageFileName');
    let file = 'helsinki_underlay.png';
    if (fileInput.value) {
        file = fileInput.files[0].name;
    }

    content += `
## GUI settings

# GUI underlay image settings
GUI.UnderlayImage.fileName = ${'data/' + file}
# Image offset in pixels (x, y)
GUI.UnderlayImage.offset = ${underlayImageOffset}
# Scaling factor for the image
GUI.UnderlayImage.scale = ${underlayImageScale}
# Image rotation (radians)
GUI.UnderlayImage.rotate = ${underlayImageRotate}

# how many events to show in the log panel (default = 30)
GUI.EventLogPanel.nrofEvents = ${eventLogPanelNrofEvents}
# Regular Expression log filter (see Pattern-class from the Java API for RE-matching details)
#GUI.EventLogPanel.REfilter = .*p[1-9]<->p[1-9]$
    `;

    // ============================================================
    // STEP 2: Build filename
    // ============================================================
    let settingsFilename = name + '_settings.txt';

    // ============================================================
    // STEP 3: Build payload with all data
    // ============================================================
    const payload = {
        settings: {
            filename: settingsFilename,
            content: content
        },
        batch_count: batchMode ? batchNum : 0,
        compile: compile,
        enable_ml: enableML,
        // Post-processing configs
        analysis: collectAnalysisConfig(),
        averager: collectBatchConfig(),
        regression: collectRegressionConfig()
    };

    // ============================================================
    // STEP 4: Send to backend /api/run-one endpoint
    // ============================================================
    // Show user that pipeline is starting
    alert(`Starting complete pipeline:\n• Saving config: ${settingsFilename}\n• Batch runs: ${batchMode ? batchNum : 'GUI mode'}\n• Post-processing: Will run automatically after simulation`);

    fetch("/api/run-one", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                let resultMsg = 'Pipeline completed successfully!\n\n';
                resultMsg += `✓ Settings saved: ${data.results.settings_file || settingsFilename}\n`;
                resultMsg += `✓ Configs saved: ${data.results.configs_saved?.join(', ') || 'None'}\n`;
                if (data.results.simulation) {
                    resultMsg += `✓ Simulation: ${data.results.simulation.success ? 'Completed' : 'Failed'}\n`;
                }
                if (data.results.post_processing?.length > 0) {
                    resultMsg += `✓ Post-processing:\n`;
                    data.results.post_processing.forEach(pp => {
                        resultMsg += `  - ${pp.script}: ${pp.success ? 'Success' : 'Failed'}\n`;
                    });
                }
                alert(resultMsg);
            } else {
                alert(`Pipeline error: ${data.message}\n\nCheck console for details.`);
                console.error('Pipeline error:', data);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("An error occurred while running the pipeline. Check console for details.");
        });
}

// ============================================================
// POST-PROCESSING CONFIG MANAGEMENT
// ============================================================

// Tagify instances for post-processing fields
let metricsIncludeTagify, metricsIgnoreTagify, enabledPlotsTagify, predictorsTagify, enabledModelsTagify;
let reportTypesTagify, batchIgnoreFieldsTagify, regressionExcludeTagify, regressionTargetTagify;

// Available options for Tagify dropdowns
const AVAILABLE_METRICS = [
    "delivery_prob", "latency_avg", "latency_med", "overhead_ratio",
    "hopcount_avg", "hopcount_med", "buffertime_avg", "buffertime_med",
    "rtt_avg", "rtt_med", "sim_time", "created", "started", "relayed",
    "aborted", "dropped", "removed", "delivered", "delivery_ratio",
    "oppo_cahce_hit", "static_cache_hit", "drop_pit", "duplicated_query"
];

const AVAILABLE_PLOTS = [
    "line_plots", "3d_surface", "violin_plots", "heatmaps", "pairplot", "export_csv"
];

const AVAILABLE_MODELS = [
    "Linear Regression", "Ridge Regression", "Lasso Regression",
    "Decision Tree", "Random Forest", "Gradient Boosting", "KNN"
];

const AVAILABLE_PREDICTORS = [
    "BufferSize", "TTL", "overhead_ratio", "hopcount_avg", "latency_avg",
    "buffertime_avg", "rtt_avg", "created", "delivered", "relayed",
    "oppo_cahce_hit", "static_cache_hit", "drop_pit", "duplicated_query"
];

const AVAILABLE_REPORT_TYPES = [
    "MessageStatsReport", "CreatedMessagesReport",
    "DeliveredMessagesReport", "BufferOccupancyReport"
];

// Initialize Tagify instances for post-processing inputs
function initPostProcessingTagify() {
    // Metrics to Include
    const metricsInput = document.getElementById('analysisMetrics');
    if (metricsInput && !metricsIncludeTagify) {
        metricsIncludeTagify = new Tagify(metricsInput, {
            whitelist: AVAILABLE_METRICS,
            enforceWhitelist: false,
            dropdown: {
                maxItems: 15,
                enabled: 0,
                closeOnSelect: false
            }
        });
        // Set default metrics
        metricsIncludeTagify.addTags(['delivery_prob', 'hopcount_avg', 'latency_avg', 'buffertime_avg', 'overhead_ratio']);
    }

    // Metrics to Ignore
    const ignoreMetricsInput = document.getElementById('analysisIgnoreMetrics');
    if (ignoreMetricsInput && !metricsIgnoreTagify) {
        metricsIgnoreTagify = new Tagify(ignoreMetricsInput, {
            whitelist: AVAILABLE_METRICS,
            enforceWhitelist: false,
            dropdown: {
                maxItems: 15,
                enabled: 0,
                closeOnSelect: false
            }
        });
    }

    // Report Types
    const reportTypesInput = document.getElementById('analysisReportTypes');
    if (reportTypesInput && !reportTypesTagify) {
        reportTypesTagify = new Tagify(reportTypesInput, {
            whitelist: AVAILABLE_REPORT_TYPES,
            enforceWhitelist: false,
            dropdown: {
                maxItems: 10,
                enabled: 0,
                closeOnSelect: false
            }
        });
        // Set default value
        reportTypesTagify.addTags(['MessageStatsReport']);
    }

    // Enabled Plots
    const plotsInput = document.getElementById('enabledPlotsTagify');
    if (plotsInput && !enabledPlotsTagify) {
        enabledPlotsTagify = new Tagify(plotsInput, {
            whitelist: AVAILABLE_PLOTS,
            enforceWhitelist: true,
            dropdown: {
                maxItems: 10,
                enabled: 0,
                closeOnSelect: false
            }
        });
    }

    // Batch Ignore Fields
    const batchIgnoreInput = document.getElementById('batchIgnoreFields');
    if (batchIgnoreInput && !batchIgnoreFieldsTagify) {
        batchIgnoreFieldsTagify = new Tagify(batchIgnoreInput, {
            whitelist: AVAILABLE_METRICS,
            enforceWhitelist: false,
            dropdown: {
                maxItems: 15,
                enabled: 0,
                closeOnSelect: false
            }
        });
    }

    // Predictor Variables
    const predictorsInput = document.getElementById('regressionPredictors');
    if (predictorsInput && !predictorsTagify) {
        predictorsTagify = new Tagify(predictorsInput, {
            whitelist: AVAILABLE_PREDICTORS,
            enforceWhitelist: false,
            dropdown: {
                maxItems: 15,
                enabled: 0,
                closeOnSelect: false
            }
        });
    }

    // Target Variable(s) - supports multiple targets for separate analyses
    const targetInput = document.getElementById('regressionTarget');
    if (targetInput && !regressionTargetTagify) {
        regressionTargetTagify = new Tagify(targetInput, {
            whitelist: AVAILABLE_METRICS,
            enforceWhitelist: false,
            dropdown: {
                maxItems: 15,
                enabled: 0,
                closeOnSelect: false
            }
        });
        // Set default value
        regressionTargetTagify.addTags(['delivery_prob']);
    }

    // Exclude Variables
    const excludeInput = document.getElementById('regressionExclude');
    if (excludeInput && !regressionExcludeTagify) {
        regressionExcludeTagify = new Tagify(excludeInput, {
            whitelist: [...AVAILABLE_METRICS, 'seed', 'run_id'],
            enforceWhitelist: false,
            dropdown: {
                maxItems: 15,
                enabled: 0,
                closeOnSelect: false
            }
        });
    }

    // Enabled Models
    const modelsInput = document.getElementById('enabledModelsTagify');
    if (modelsInput && !enabledModelsTagify) {
        enabledModelsTagify = new Tagify(modelsInput, {
            whitelist: AVAILABLE_MODELS,
            enforceWhitelist: true,
            dropdown: {
                maxItems: 10,
                enabled: 0,
                closeOnSelect: false
            }
        });
    }
}

// Browse directory function for post-processing inputs
function browseDirectory(inputId) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.webkitdirectory = true;
    fileInput.addEventListener("change", (event) => {
        if (event.target.files.length > 0) {
            const directoryPath = event.target.files[0].webkitRelativePath.split("/")[0];
            document.getElementById(inputId).value = directoryPath;
        }
    });
    fileInput.click();
}

// ============================================================
// DYNAMIC TABLE HELPERS FOR POST-PROCESSING CONFIGS
// ============================================================

// Colors for pattern preview (matching the static section)
const PATTERN_COLORS = {
    scenario_name: '#fbbf24',
    router: '#34d399',
    seed: '#60a5fa',
    ttl: '#f472b6',
    report_type: '#c084fc',
    default: '#94a3b8'
};

// Update the pattern preview based on current components
function updatePatternPreview() {
    const tbody = document.getElementById('batchComponentsBody');
    const previewContainer = document.getElementById('dynamicPatternPreview');
    const positionsContainer = document.getElementById('dynamicPatternPositions');

    if (!tbody || !previewContainer) return;

    // Collect components from table
    const components = [];
    tbody.querySelectorAll('tr').forEach(row => {
        const nameInput = row.querySelector('input[data-field="name"]');
        const posInput = row.querySelector('input[data-field="position"]');
        if (nameInput && posInput) {
            components.push({
                name: nameInput.value || 'unknown',
                position: parseInt(posInput.value) || 0
            });
        }
    });

    // Sort by position
    components.sort((a, b) => a.position - b.position);

    // Get delimiter
    const delimiterInput = document.getElementById('batchDelimiter');
    const delimiter = delimiterInput ? delimiterInput.value || '_' : '_';

    // Build pattern preview
    let patternHtml = '';
    let exampleHtml = '→ ';

    const exampleValues = {
        scenario_name: 'default_scenario',
        router: 'EpidemicRouter',
        seed: '1',
        ttl: '300',
        report_type: 'MessageStatsReport'
    };

    components.forEach((comp, idx) => {
        const color = PATTERN_COLORS[comp.name] || PATTERN_COLORS.default;
        const displayName = comp.name.charAt(0).toUpperCase() + comp.name.slice(1).replace(/_/g, ' ');
        const exampleValue = exampleValues[comp.name] || comp.name;

        if (idx > 0) {
            patternHtml += delimiter;
            exampleHtml += delimiter;
        }
        patternHtml += `<span style="color: ${color};">${displayName}</span>`;
        exampleHtml += `<span style="color: ${color};">${exampleValue}</span>`;
    });

    patternHtml += '.txt';
    exampleHtml += '.txt';

    previewContainer.innerHTML = `
        <div style="color: ${delimiter === '_' ? '#e2e8f0' : '#fbbf24'}; font-weight: bold; margin-bottom: 5px;">
            Pattern: ${patternHtml}
        </div>
        <div style="font-size: 12px; color: #94a3b8;">
            ${exampleHtml}
        </div>
    `;

    // Update positions container
    if (positionsContainer) {
        let positionsHtml = '';
        components.forEach(comp => {
            const color = PATTERN_COLORS[comp.name] || PATTERN_COLORS.default;
            const displayName = comp.name.charAt(0).toUpperCase() + comp.name.slice(1).replace(/_/g, ' ');
            positionsHtml += `
                <div style="background: white; padding: 10px; border-radius: 6px; border-left: 3px solid ${color};">
                    <strong>Position ${comp.position}:</strong> ${displayName}
                </div>
            `;
        });
        positionsContainer.innerHTML = positionsHtml;
    }
}

// Make it globally available
window.updatePatternPreview = updatePatternPreview;

// Add a component row to the batch components table
function addBatchComponent(name = '', position = 0) {
    const tbody = document.getElementById('batchComponentsBody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" data-field="name" value="${name}" placeholder="e.g., router" onchange="updatePatternPreview()"></td>
        <td><input type="number" data-field="position" value="${position}" min="0" onchange="updatePatternPreview()"></td>
        <td>
            <button type="button" class="remove-button" onclick="removeDynamicRow(this)" style="padding: 4px 8px;">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(row);
}

// Add an average group row to the batch average groups table
function addBatchAverageGroup(name = '', groupBy = '', minFiles = 2, outputTemplate = '') {
    const tbody = document.getElementById('batchAverageGroupsBody');
    if (!tbody) return;

    const groupByStr = Array.isArray(groupBy) ? groupBy.join(', ') : groupBy;
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" data-field="name" value="${name}" placeholder="e.g., ttl_group"></td>
        <td><input type="text" data-field="groupBy" value="${groupByStr}" placeholder="e.g., report_type, router, ttl"></td>
        <td><input type="number" data-field="minFiles" value="${minFiles}" min="1" style="width: 60px;"></td>
        <td><input type="text" data-field="outputTemplate" value="${outputTemplate}" placeholder="e.g., {report_type}_{router}_{ttl}_{grouping_type}_average.txt"></td>
        <td>
            <button type="button" class="remove-button" onclick="removeDynamicRow(this)" style="padding: 4px 8px;">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(row);
}

// Add a grouping label row to the analysis grouping labels table
function addAnalysisGroupingLabel(groupingType = '', displayLabel = '') {
    const tbody = document.getElementById('analysisGroupingLabelsBody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" data-field="type" value="${groupingType}" placeholder="e.g., ttl"></td>
        <td><input type="text" data-field="label" value="${displayLabel}" placeholder="e.g., TTL (seconds)"></td>
        <td>
            <button type="button" class="remove-button" onclick="removeDynamicRow(this)" style="padding: 4px 8px;">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(row);
}

// Remove a row from any dynamic table
function removeDynamicRow(button) {
    const row = button.closest('tr');
    if (row) {
        row.remove();
    }
}

// Load all configs when Post-Processing tab is opened
function loadAllConfigs() {
    initPostProcessingTagify();
    loadAnalysisConfig();
    loadBatchConfig();
    loadRegressionConfig();

    // Setup auto-save after configs are loaded
    setTimeout(setupAutoSave, 1000);
}

// ============================================================================
// AUTO-SAVE FUNCTIONALITY - Saves config changes automatically
// ============================================================================

let autoSaveTimer = null;
let lastSaveStatus = null;

// Debounce function to avoid too many saves
function debounce(func, wait) {
    return function executedFunction(...args) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => func.apply(this, args), wait);
    };
}

// Show save status indicator
function showSaveStatus(message, isSuccess) {
    // Create or find status element
    let statusEl = document.getElementById('autoSaveStatus');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'autoSaveStatus';
        statusEl.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            transition: opacity 0.3s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(statusEl);
    }

    statusEl.textContent = message;
    statusEl.style.backgroundColor = isSuccess ? '#10b981' : '#ef4444';
    statusEl.style.color = 'white';
    statusEl.style.opacity = '1';

    // Fade out after 2 seconds
    setTimeout(() => {
        statusEl.style.opacity = '0';
    }, 2000);
}

// Auto-save all post-processing configs
const autoSaveConfigs = debounce(function () {
    console.log('Auto-saving configs...');

    // Save all three configs
    Promise.all([
        saveAnalysisConfigSilent(),
        saveBatchConfigSilent(),
        saveRegressionConfigSilent()
    ]).then(results => {
        const allSuccess = results.every(r => r === true);
        if (allSuccess) {
            showSaveStatus('✓ Settings saved', true);
        } else {
            showSaveStatus('⚠ Some settings failed to save', false);
        }
    }).catch(error => {
        console.error('Auto-save error:', error);
        showSaveStatus('✗ Save failed', false);
    });
}, 1000); // Wait 1 second after last change before saving

// Silent save functions (no alerts)
function saveAnalysisConfigSilent() {
    return fetch('/api/config/analysis')
        .then(response => response.json())
        .then(config => {
            // Update directories - use batchFolder as the shared report directory
            config.directories = config.directories || {};
            config.directories.report_dir = document.getElementById('batchFolder')?.value || 'reports/';
            config.directories.plots_dir = document.getElementById('analysisPlotsDir')?.value || 'plots/';

            // Update other fields - sync from shared inputs
            config.data_separator = document.getElementById('batchDataSeparator')?.value || ':';
            config.report_extension = document.getElementById('batchExtension')?.value || '.txt';

            return fetch('/api/config/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
        })
        .then(response => response.json())
        .then(data => data.success)
        .catch(() => false);
}

function saveBatchConfigSilent() {
    return fetch('/api/config/averager')
        .then(response => response.json())
        .then(config => {
            config.folder = document.getElementById('batchFolder')?.value || 'reports/';
            config.file_filter = config.file_filter || {};
            config.file_filter.extension = document.getElementById('batchExtension')?.value || '.txt';
            config.filename_pattern = config.filename_pattern || {};
            config.filename_pattern.delimiter = document.getElementById('batchDelimiter')?.value || '_';
            config.data_separator = document.getElementById('batchDataSeparator')?.value || ':';
            config.output = config.output || {};
            config.output.precision = parseInt(document.getElementById('batchPrecision')?.value) || 4;

            return fetch('/api/config/averager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
        })
        .then(response => response.json())
        .then(data => data.success)
        .catch(() => false);
}

function saveRegressionConfigSilent() {
    return fetch('/api/config/regression')
        .then(response => response.json())
        .then(config => {
            config.input = config.input || {};
            config.input.csv_directory = document.getElementById('regressionCsvDir')?.value || 'plots/';
            config.output = config.output || {};
            config.output.directory = document.getElementById('regressionOutputDir')?.value || 'regression_results/';
            config.features = config.features || {};
            config.features.target = document.getElementById('regressionTarget')?.value || 'delivery_prob';
            config.features.selection_mode = document.getElementById('regressionSelectionMode')?.value || 'manual';
            config.features.normalize = document.getElementById('regressionNormalize')?.checked ?? true;
            config.model_settings = config.model_settings || {};
            config.model_settings.split_settings = config.model_settings.split_settings || {};
            config.model_settings.split_settings.train_size = parseFloat(document.getElementById('regressionTrainSize')?.value) || 0.75;
            config.model_settings.split_settings.random_state = parseInt(document.getElementById('regressionRandomState')?.value) || 5;

            return fetch('/api/config/regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
        })
        .then(response => response.json())
        .then(data => data.success)
        .catch(() => false);
}

// Setup auto-save listeners on all post-processing form inputs
function setupAutoSave() {
    const postProcessingDiv = document.getElementById('PostProcessing');
    if (!postProcessingDiv) return;

    // Listen for changes on all input types
    const inputs = postProcessingDiv.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('change', autoSaveConfigs);
        input.addEventListener('input', autoSaveConfigs);
    });

    console.log('Auto-save enabled for', inputs.length, 'fields');
}



// Analysis Config
function loadAnalysisConfig() {
    fetch('/api/config/analysis')
        .then(response => response.json())
        .then(config => {
            if (config.error) {
                console.error('Error loading analysis config:', config.error);
                return;
            }
            // Directories
            document.getElementById('analysisReportDir').value = config.directories?.report_dir || '';
            document.getElementById('analysisPlotsDir').value = config.directories?.plots_dir || '';

            // Basic settings
            document.getElementById('analysisDataSeparator').value = config.data_separator || ':';
            document.getElementById('analysisReportExtension').value = config.file_patterns?.report_extension || '.txt';

            // Report Types using Tagify - only override if config has values
            if (reportTypesTagify && config.report_types && config.report_types.length > 0) {
                reportTypesTagify.removeAllTags();
                reportTypesTagify.addTags(config.report_types);
            }

            // Metrics using Tagify - only override if config has values
            if (metricsIncludeTagify && config.metrics?.include && config.metrics.include.length > 0) {
                metricsIncludeTagify.removeAllTags();
                metricsIncludeTagify.addTags(config.metrics.include);
            }
            if (metricsIgnoreTagify && config.metrics?.ignore && config.metrics.ignore.length > 0) {
                metricsIgnoreTagify.removeAllTags();
                metricsIgnoreTagify.addTags(config.metrics.ignore);
            }

            // Enabled plots using Tagify - only override if config has values
            if (enabledPlotsTagify && config.enabled_plots) {
                const enabledPlots = Object.entries(config.enabled_plots)
                    .filter(([key, value]) => value === true)
                    .map(([key]) => key);
                if (enabledPlots.length > 0) {
                    enabledPlotsTagify.removeAllTags();
                    enabledPlotsTagify.addTags(enabledPlots);
                }
            }

            // Advanced Settings - Filename Structure
            document.getElementById('analysisFilenameDelimiter').value = config.filename_structure?.delimiter || '_';
            document.getElementById('analysisReportTypePos').value = config.filename_structure?.average_files?.report_type_position ?? 0;
            document.getElementById('analysisRouterPos').value = config.filename_structure?.average_files?.router_position ?? 1;
            document.getElementById('analysisGroupingTypePos').value = config.filename_structure?.average_files?.grouping_type_position ?? -1;

            // Plot Thresholds
            document.getElementById('analysisMinValuesLine').value = config.plot_thresholds?.min_values_for_line ?? 2;
            document.getElementById('analysisMinValuesSurface').value = config.plot_thresholds?.min_values_for_surface ?? 3;
            document.getElementById('analysisMinFilesHeatmap').value = config.plot_thresholds?.min_files_for_heatmap ?? 2;

            // Grouping Labels (Dynamic Table)
            const labelsBody = document.getElementById('analysisGroupingLabelsBody');
            if (labelsBody) {
                labelsBody.innerHTML = '';
                const labels = config.grouping_labels || {};
                Object.entries(labels).forEach(([type, label]) => {
                    addAnalysisGroupingLabel(type, label);
                });
            }
        })
        .catch(error => console.error('Failed to load analysis config:', error));
}

function saveAnalysisConfig() {
    fetch('/api/config/analysis')
        .then(response => response.json())
        .then(config => {
            // Update directories
            config.directories = config.directories || {};
            config.directories.report_dir = document.getElementById('analysisReportDir').value;
            config.directories.plots_dir = document.getElementById('analysisPlotsDir').value;

            // Update metrics using Tagify
            config.metrics = config.metrics || {};
            if (metricsIncludeTagify) {
                const tags = metricsIncludeTagify.value || [];
                config.metrics.include = tags.map(t => t.value);
            }
            if (metricsIgnoreTagify) {
                const tags = metricsIgnoreTagify.value || [];
                config.metrics.ignore = tags.map(t => t.value);
            }

            // Update enabled plots using Tagify
            config.enabled_plots = config.enabled_plots || {};
            // Reset all to false first
            AVAILABLE_PLOTS.forEach(plot => {
                config.enabled_plots[plot] = false;
            });
            // Then enable selected ones
            if (enabledPlotsTagify) {
                const tags = enabledPlotsTagify.value || [];
                tags.forEach(t => {
                    config.enabled_plots[t.value] = true;
                });
            }

            // Save
            return fetch('/api/config/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Analysis config saved successfully!');
            } else {
                alert('Error saving config: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save analysis config');
        });
}

// Batch Config
function loadBatchConfig() {
    fetch('/api/config/batch')
        .then(response => response.json())
        .then(config => {
            if (config.error) {
                console.error('Error loading batch config:', config.error);
                return;
            }
            document.getElementById('batchFolder').value = config.folder || '';
            document.getElementById('batchExtension').value = config.file_filter?.extension || '.txt';
            document.getElementById('batchDelimiter').value = config.filename_pattern?.delimiter || '_';
            document.getElementById('batchDataSeparator').value = config.data_separator || ':';
            document.getElementById('batchPrecision').value = config.output?.precision || 4;

            // Ignore fields using Tagify
            if (batchIgnoreFieldsTagify && config.ignore_fields) {
                batchIgnoreFieldsTagify.removeAllTags();
                batchIgnoreFieldsTagify.addTags(config.ignore_fields);
            }

            // Advanced Settings - Filename Pattern Components (Dynamic Table)
            const componentsBody = document.getElementById('batchComponentsBody');
            if (componentsBody) {
                componentsBody.innerHTML = '';
                const components = config.filename_pattern?.components || {};
                Object.entries(components).forEach(([name, position]) => {
                    addBatchComponent(name, position);
                });
            }

            // Average Groups (Dynamic Table)
            const groupsBody = document.getElementById('batchAverageGroupsBody');
            if (groupsBody) {
                groupsBody.innerHTML = '';
                const groups = config.average_groups || [];
                if (groups.length > 0) {
                    groups.forEach(group => {
                        addBatchAverageGroup(
                            group.name || '',
                            group.group_by || [],
                            group.min_files || 2,
                            group.output_template || ''
                        );
                    });
                } else {
                    // Add default average groups if none defined
                    addBatchAverageGroup('ttl_average', ['router', 'ttl'], 2, '{report_type}_{router}_{ttl}_ttl_average.txt');
                    addBatchAverageGroup('buffer_average', ['router', 'buffer'], 2, '{report_type}_{router}_{buffer}_buffer_average.txt');
                }
            }

            // Update the pattern preview after loading
            setTimeout(() => updatePatternPreview(), 100);
        })
        .catch(error => console.error('Failed to load batch config:', error));
}

function saveBatchConfig() {
    fetch('/api/config/batch')
        .then(response => response.json())
        .then(config => {
            config.folder = document.getElementById('batchFolder').value;
            config.file_filter = config.file_filter || {};
            config.file_filter.extension = document.getElementById('batchExtension').value;

            config.filename_pattern = config.filename_pattern || {};
            config.filename_pattern.delimiter = document.getElementById('batchDelimiter').value;

            // Update min_files for all groups
            const minFiles = parseInt(document.getElementById('batchMinFiles').value) || 2;
            if (config.average_groups) {
                config.average_groups.forEach(group => {
                    group.min_files = minFiles;
                });
            }

            config.output = config.output || {};
            config.output.precision = parseInt(document.getElementById('batchPrecision').value) || 4;

            return fetch('/api/config/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Batch config saved successfully!');
            } else {
                alert('Error saving config: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save batch config');
        });
}

// Regression Config
function loadRegressionConfig() {
    fetch('/api/config/regression')
        .then(response => response.json())
        .then(config => {
            if (config.error) {
                console.error('Error loading regression config:', config.error);
                return;
            }
            document.getElementById('regressionCsvDir').value = config.input?.csv_directory || '';
            document.getElementById('regressionOutputDir').value = config.output?.directory || 'regression_results/';

            // Target using Tagify - supports multiple targets
            const targets = config.features?.targets || (config.features?.target ? [config.features.target] : []);
            if (regressionTargetTagify && targets.length > 0) {
                regressionTargetTagify.removeAllTags();
                regressionTargetTagify.addTags(targets);
            }

            // Predictors using Tagify - only override if config has values
            if (predictorsTagify && config.features?.predictors && config.features.predictors.length > 0) {
                predictorsTagify.removeAllTags();
                predictorsTagify.addTags(config.features.predictors);
            }

            // Exclude variables using Tagify - only override if config has values
            if (regressionExcludeTagify && config.features?.exclude && config.features.exclude.length > 0) {
                regressionExcludeTagify.removeAllTags();
                regressionExcludeTagify.addTags(config.features.exclude);
            }

            document.getElementById('regressionTrainSize').value = config.model_settings?.split_settings?.train_size || 0.75;
            document.getElementById('regressionRandomState').value = config.model_settings?.split_settings?.random_state || 5;

            // Enabled models using Tagify - only override if config has values
            if (enabledModelsTagify && config.model_settings?.enabled_models) {
                const enabledModels = Object.entries(config.model_settings.enabled_models)
                    .filter(([key, value]) => value === true)
                    .map(([key]) => key);
                if (enabledModels.length > 0) {
                    enabledModelsTagify.removeAllTags();
                    enabledModelsTagify.addTags(enabledModels);
                }
            }

            // Checkboxes
            document.getElementById('regressionNormalize').checked = config.features?.normalize ?? true;
            document.getElementById('polyEnabled').checked = config.features?.polynomial_features?.enabled ?? true;
            document.getElementById('regressionCVEnabled').checked = config.model_settings?.cross_validation?.enabled ?? true;

            // Advanced Settings - Polynomial Features
            document.getElementById('polyDegree').value = config.features?.polynomial_features?.degree ?? 2;
            document.getElementById('polyInteractionOnly').checked = config.features?.polynomial_features?.interaction_only ?? true;
            document.getElementById('polyIncludeBias').checked = config.features?.polynomial_features?.include_bias ?? false;

            // Cross Validation
            document.getElementById('regressionCVFolds').value = config.model_settings?.cross_validation?.folds ?? 5;

            // Model Parameters
            const params = config.model_settings?.parameters || {};
            document.getElementById('knnNeighbors').value = params.KNN?.n_neighbors ?? 6;
            document.getElementById('dtMaxDepth').value = params['Decision Tree']?.max_depth || '';
            document.getElementById('rfEstimators').value = params['Random Forest']?.n_estimators ?? 100;
            document.getElementById('gbEstimators').value = params['Gradient Boosting']?.n_estimators ?? 100;
            document.getElementById('gbLearningRate').value = params['Gradient Boosting']?.learning_rate ?? 0.1;
            document.getElementById('gbMaxDepth').value = params['Gradient Boosting']?.max_depth ?? 3;
        })
        .catch(error => console.error('Failed to load regression config:', error));
}

function saveRegressionConfig() {
    fetch('/api/config/regression')
        .then(response => response.json())
        .then(config => {
            config.input = config.input || {};
            config.input.csv_directory = document.getElementById('regressionCsvDir').value;

            config.output = config.output || {};
            config.output.directory = document.getElementById('regressionOutputDir').value;

            config.features = config.features || {};
            config.features.target = document.getElementById('regressionTarget').value;

            // Predictors using Tagify
            if (predictorsTagify) {
                const tags = predictorsTagify.value || [];
                config.features.predictors = tags.map(t => t.value);
            }

            config.model_settings = config.model_settings || {};
            config.model_settings.split_settings = config.model_settings.split_settings || {};
            config.model_settings.split_settings.train_size = parseFloat(document.getElementById('regressionTrainSize').value) || 0.75;
            config.model_settings.split_settings.random_state = parseInt(document.getElementById('regressionRandomState').value) || 5;

            // Enabled models using Tagify
            config.model_settings.enabled_models = config.model_settings.enabled_models || {};
            // Reset all to false first
            AVAILABLE_MODELS.forEach(model => {
                config.model_settings.enabled_models[model] = false;
            });
            // Then enable selected ones
            if (enabledModelsTagify) {
                const tags = enabledModelsTagify.value || [];
                tags.forEach(t => {
                    config.model_settings.enabled_models[t.value] = true;
                });
            }

            config.features.polynomial_features = config.features.polynomial_features || {};
            config.features.polynomial_features.enabled = document.getElementById('polyEnabled').checked;

            return fetch('/api/config/regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Regression config saved successfully!');
            } else {
                alert('Error saving config: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save regression config');
        });
}

// Save All Post-Processing Configs - saves batch, analysis, and regression configs in one click
function saveAllPostProcessingConfigs() {
    const button = event.target.closest('button');
    const originalText = button.innerHTML;

    // Show loading state
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    // Collect all configs
    const analysisConfig = collectAnalysisConfig();
    const batchConfig = collectBatchConfig();
    const regressionConfig = collectRegressionConfig();

    // Save all configs via the save-all endpoint
    const payload = {
        analysis: analysisConfig,
        batch: batchConfig,
        regression: regressionConfig
    };

    fetch('/api/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('All configs saved successfully!\n\nSaved: ' +
                    Object.keys(data.results?.configs || {}).join(', '));
            } else {
                alert('Error saving configs: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save configs: ' + error.message);
        })
        .finally(() => {
            button.disabled = false;
            button.innerHTML = originalText;
        });
}

// Process Data function - runs batch -> analysis -> regression (optional)
function processData() {
    const enableML = document.getElementById('enableML')?.checked || false;
    const button = event.target.closest('button');
    const originalText = button.innerHTML;

    // Show loading state
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    fetch('/api/process-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_ml: enableML })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let message = 'Data processing completed successfully!\n\n';
                if (data.results) {
                    data.results.forEach(result => {
                        message += `${result.script}: ${result.success ? '✓ Success' : '✗ Failed'} \n`;
                    });
                }
                alert(message);
            } else {
                let message = `Processing failed: ${data.message} \n\n`;
                if (data.results) {
                    data.results.forEach(result => {
                        message += `${result.script}: ${result.success ? '✓ Success' : '✗ Failed'} \n`;
                        if (!result.success && result.output) {
                            message += `  Error: ${result.output.substring(0, 200)} \n`;
                        }
                    });
                }
                alert(message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to process data: ' + error.message);
        })
        .finally(() => {
            button.disabled = false;
            button.innerHTML = originalText;
        });
}

// Auto-load configs when Post-Processing tab is displayed
document.addEventListener('DOMContentLoaded', function () {
    // Load configs immediately on page load so defaults are ready
    // This ensures Run ONE works even if user doesn't visit Post-Processing tab
    setTimeout(() => {
        loadAllConfigs();
    }, 500); // Small delay to ensure DOM is fully ready

    // Track current tab to detect when leaving Config tab
    let currentTab = 'ScenarioSettings';

    // Also reload when Post-Processing tab opens (to refresh if needed)
    const originalOpenTab = window.openTab;
    window.openTab = function (evt, tabName) {
        // Save configs when LEAVING the PostProcessing (Config) tab
        if (currentTab === 'PostProcessing' && tabName !== 'PostProcessing') {
            console.log('Leaving Config tab - saving all configs...');
            // Save all configs immediately (not debounced)
            if (typeof saveBatchConfigSilent === 'function') saveBatchConfigSilent();
            if (typeof saveAnalysisConfigSilent === 'function') saveAnalysisConfigSilent();
            if (typeof saveRegressionConfigSilent === 'function') saveRegressionConfigSilent();
        }

        // Call original tab switch
        originalOpenTab(evt, tabName);

        // Only reload configs when ENTERING PostProcessing fresh (not when already there)
        if (tabName === 'PostProcessing' && currentTab !== 'PostProcessing') {
            loadAllConfigs();
        }

        // Update current tab tracker
        currentTab = tabName;
    };
});

// ============================================================
// STANDALONE POST-PROCESSING FUNCTIONS
// ============================================================

/**
 * Run a single post-processing step (averager, analysis, or regression)
 */
async function runPostProcessingStep(step) {
    const logDiv = document.getElementById('postProcessingOutput');
    const logPre = document.getElementById('postProcessingLog');

    // Show output area
    if (logDiv) logDiv.style.display = 'block';
    if (logPre) logPre.textContent = `Running ${step}...\n`;

    const endpoints = {
        'averager': '/api/run-averager',
        'analysis': '/api/run-analysis',
        'regression': '/api/run-regression'
    };

    const endpoint = endpoints[step];
    if (!endpoint) {
        if (logPre) logPre.textContent += `Unknown step: ${step}\n`;
        return;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            if (logPre) {
                logPre.textContent += `✓ ${data.message}\n`;
                if (data.output) {
                    logPre.textContent += `\n--- Output ---\n${data.output}\n`;
                }
            }
            showSaveStatus(`✓ ${step} completed`, true);
        } else {
            if (logPre) {
                logPre.textContent += `✗ ${data.message}\n`;
                if (data.output) {
                    logPre.textContent += `\n--- Error ---\n${data.output}\n`;
                }
            }
            showSaveStatus(`✗ ${step} failed`, false);
        }
    } catch (error) {
        console.error(`Error running ${step}:`, error);
        if (logPre) logPre.textContent += `✗ Error: ${error.message}\n`;
        showSaveStatus(`✗ ${step} error`, false);
    }
}

/**
 * Run all post-processing steps in sequence
 */
async function runAllPostProcessing() {
    const logDiv = document.getElementById('postProcessingOutput');
    const logPre = document.getElementById('postProcessingLog');

    // Show output area
    if (logDiv) logDiv.style.display = 'block';
    if (logPre) logPre.textContent = 'Starting all post-processing...\n\n';

    const steps = ['averager', 'analysis', 'regression'];
    let allSuccess = true;

    for (const step of steps) {
        if (logPre) logPre.textContent += `→ Running ${step}...\n`;

        try {
            const response = await fetch(`/api/run-${step}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.success) {
                if (logPre) logPre.textContent += `  ✓ ${data.message}\n`;
            } else {
                if (logPre) logPre.textContent += `  ✗ ${data.message}\n`;
                allSuccess = false;
                // Continue to next step even if one fails
            }
        } catch (error) {
            if (logPre) logPre.textContent += `  ✗ Error: ${error.message}\n`;
            allSuccess = false;
        }
    }

    if (logPre) logPre.textContent += `\n${allSuccess ? '✓ All steps completed!' : '⚠ Some steps failed'}`;
    showSaveStatus(allSuccess ? '✓ Post-processing complete' : '⚠ Post-processing had errors', allSuccess);
}

// Make functions globally available
window.runPostProcessingStep = runPostProcessingStep;
window.runAllPostProcessing = runAllPostProcessing;

// ============================================================
// FILENAME PRESET WIZARD
// ============================================================

/**
 * Apply a filename pattern preset - auto-configures ALL related settings
 * This makes it completely effortless for beginners - one click does everything
 */
function applyFilenamePreset(presetName) {
    const presets = {
        'standard': {
            // Filename components (what each part of filename means)
            components: {
                'scenario_name': 0,
                'router': 1,
                'seed': 2,
                'ttl': 3,
                'buffer': 4,
                'report_type': 5
            },
            // Analysis position settings
            positions: {
                report_type: 5,
                router: 1,
                ttl: 3,
                buffer: 4
            },
            // Average groups: Group by ALL parameters EXCEPT seed
            // This averages results across random seeds for the same configuration
            averageGroups: [
                {
                    name: 'avg_TTL',
                    // Group by: report_type + router + ttl + buffer
                    // This averages all seeds for the same TTL+Buffer+Router combo
                    groupBy: ['router', 'ttl'],
                    minFiles: 2,
                    outputTemplate: "{report_type}_{router}_{ttl}_ttl_average.txt"
                },

                {
                    name: 'avg_buffer',
                    // Group by: report_type + router + ttl + buffer
                    // This averages all seeds for the same TTL+Buffer+Router combo
                    groupBy: ['router', 'buffer'],
                    minFiles: 2,
                    outputTemplate: "{report_type}_{router}_{buffer}_buffer_average.txt"
                }
            ],
            example: 'Scenario_Router_Seed_TTL_Buffer_Report.txt'
        },
        'simple': {
            components: {
                'report_type': 0,
                'router': 1,
                'seed': 2
            },
            positions: {
                report_type: 0,
                router: 1,
                grouping_type: -1
            },
            averageGroups: [
                {
                    name: 'router_group',
                    groupBy: ['report_type', 'router'],
                    minFiles: 2,
                    outputTemplate: '{report_type}_{router}_average.txt'
                }
            ],
            example: 'Report_Router_Seed.txt'
        },
        'custom': {
            custom: true
        }
    };

    const preset = presets[presetName];
    if (!preset) return;

    // If custom, just open the advanced settings
    if (preset.custom) {
        const advancedDetails = document.querySelector('#postProcessingConfigSection details');
        if (advancedDetails) {
            advancedDetails.open = true;
            advancedDetails.scrollIntoView({ behavior: 'smooth' });
        }
        showSaveStatus('📝 Configure your custom pattern below', true);
        return;
    }

    // 1. Apply filename components
    const componentsBody = document.getElementById('batchComponentsBody');
    if (componentsBody) {
        componentsBody.innerHTML = '';
        Object.entries(preset.components).forEach(([name, position]) => {
            addBatchComponent(name, position);
        });
    }

    // 2. Apply average groups (auto-generated!)
    const groupsBody = document.getElementById('batchAverageGroupsBody');
    if (groupsBody && preset.averageGroups) {
        groupsBody.innerHTML = '';
        preset.averageGroups.forEach(group => {
            addBatchAverageGroup(
                group.name,
                group.groupBy,
                group.minFiles,
                group.outputTemplate
            );
        });
    }

    // 3. Apply position settings
    const reportTypePos = document.getElementById('analysisReportTypePos');
    const routerPos = document.getElementById('analysisRouterPos');
    const groupingPos = document.getElementById('analysisGroupingTypePos');

    if (reportTypePos) reportTypePos.value = preset.positions.report_type;
    if (routerPos) routerPos.value = preset.positions.router;
    if (groupingPos) groupingPos.value = preset.positions.grouping_type;

    // 4. Update the preview
    updatePatternPreview();

    // 5. Show success with details
    const groupCount = preset.averageGroups?.length || 0;
    showSaveStatus(`✓ Applied "${presetName}" - ${groupCount} averaging rules configured!`, true);

    // 6. Trigger auto-save to persist config
    if (typeof autoSaveConfigs === 'function') {
        autoSaveConfigs();
    }
}

// Make it globally available
window.applyFilenamePreset = applyFilenamePreset;

/**
 * Apply a folder preset from dropdown
 */
function applyFolderPreset(inputId, value) {
    if (value) {
        document.getElementById(inputId).value = value;
        // Trigger auto-save
        if (typeof autoSaveConfigs === 'function') {
            autoSaveConfigs();
        }
    }
}

// Make it globally available
window.applyFolderPreset = applyFolderPreset;

