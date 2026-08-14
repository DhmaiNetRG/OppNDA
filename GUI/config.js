/**
 * Helper function to parse ONE Simulator batch expressions safely.
 * ONE Simulator uses semicolons to denote array elements (e.g. [1; 5] is two elements, 1 and 5).
 */
function calculateBatchSize(valueStr) {
    if (!valueStr || typeof valueStr !== 'string') return 1;
    
    // Clean brackets
    let cleanStr = valueStr.replace(/^\[/, '').replace(/\]$/, '').trim();
    if (!cleanStr.includes(';')) return 1;

    let parts = cleanStr.split(';').map(p => p.trim()).filter(p => p !== '');
    return parts.length || 1;
}

// Default values for interface settings
const interfaceSettings = [
    { name: "btInterface", type: "SimpleBroadcastInterface", transmitSpeed: "250k", transmitRange: "10" },
    { name: "highspeedInterface", type: "SimpleBroadcastInterface", transmitSpeed: "10M", transmitRange: "1000" }
];

// Interface Tagify will be initialized in DOMContentLoaded
// Default values for group settings
let groupSettings = [
    { groupID: 'p', numHosts: 40, movementModel: "ShortestPathMapBasedMovement", routeFile: "", routeType: 0, router: "EpidemicRouter", activeTimes: "0", messageTTL: "300", actions: "Edit/Delete" },
    { groupID: 'car', numHosts: 40, movementModel: "ShortestPathMapBasedMovement", routeFile: "", routeType: 0, router: "EpidemicRouter", activeTimes: "0", messageTTL: "300", actions: "Edit/Delete" },
    { groupID: 'w', numHosts: 40, movementModel: "ShortestPathMapBasedMovement", routeFile: "", routeType: 0, router: "EpidemicRouter", activeTimes: "0", messageTTL: "300", actions: "Edit/Delete" },
    { groupID: 't', numHosts: 2, movementModel: "MapRouteMovement", routeFile: "data/tram3.wkt", routeType: 1, router: "EpidemicRouter", activeTimes: "0", messageTTL: "300", actions: "Edit/Delete" },
    { groupID: 't', numHosts: 2, movementModel: "MapRouteMovement", routeFile: "data/tram4.wkt", routeType: 2, router: "EpidemicRouter", activeTimes: "0", messageTTL: "300", actions: "Edit/Delete" },
    { groupID: 't', numHosts: 2, movementModel: "MapRouteMovement", routeFile: "data/tram10.wkt", routeType: 2, router: "EpidemicRouter", activeTimes: "0", messageTTL: "300", actions: "Edit/Delete" }
];

let mapFileEntries = [
    { name: 'shops.wkt', file: null },
    { name: 'pedestrian_paths.wkt', file: null },
    { name: 'main_roads.wkt', file: null },
    { name: 'roads.wkt', file: null }
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

function parseTagifyLikeValues(rawValue) {
    if (Array.isArray(rawValue)) {
        return rawValue
            .map(item => (typeof item === 'object' ? item.value : item))
            .map(item => String(item).trim())
            .filter(Boolean);
    }

    if (typeof rawValue !== 'string') {
        return [];
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
        return [];
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parseTagifyLikeValues(parsed);
            }
        } catch (error) {
            const inner = trimmed.slice(1, -1);
            return inner
                .split(/[;,]/)
                .map(item => item.trim())
                .filter(Boolean);
        }
    }

    return trimmed
        .split(/[;,]/)
        .map(item => item.trim())
        .filter(Boolean);
}

function getTagifyInputValues(inputOrId, fallbackValues = []) {
    const input = typeof inputOrId === 'string'
        ? document.getElementById(inputOrId)
        : inputOrId;

    if (!input) {
        return [...fallbackValues];
    }

    if (input._tagify && Array.isArray(input._tagify.value) && input._tagify.value.length > 0) {
        return input._tagify.value
            .map(tag => String(tag.value || '').trim())
            .filter(Boolean);
    }

    const parsed = parseTagifyLikeValues(input.value);
    return parsed.length > 0 ? parsed : [...fallbackValues];
}

function getRouterConfigValue() {
    const routers = getTagifyInputValues('commonRouter', ['EpidemicRouter']);
    return `[${routers.join('; ')}]`;
}

function getNormalizedDataFileValue(inputOrId) {
    const input = typeof inputOrId === 'string'
        ? document.getElementById(inputOrId)
        : inputOrId;

    if (!input) {
        return '';
    }

    let rawValue = '';
    if (input.files && input.files[0] && input.files[0].name) {
        rawValue = input.files[0].name;
    } else if (typeof input.value === 'string') {
        rawValue = input.value.trim();
    }

    if (!rawValue) {
        return '';
    }

    const normalized = rawValue.replace(/\\/g, '/');
    if (normalized.startsWith('data/')) {
        return normalized;
    }

    const filenameOnly = normalized.split('/').pop();
    return filenameOnly ? `data/${filenameOnly}` : '';
}

function getRegressionTargets() {
    const targets = getTagifyInputValues('regressionTarget', ['delivery_prob']);
    return targets.length > 0 ? targets : ['delivery_prob'];
}

function sanitizeFilenameBase(value, fallback = 'default_scenario') {
    const normalized = String(value || '')
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/\s+/g, '_');
    return normalized || fallback;
}

function postConfig(configName, payload) {
    return fetch(`/api/config/${configName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(response => response.json());
}

function getAssetRelativePathFromFile(file) {
    return file && file.name ? `data/${file.name}` : '';
}

function collectDataAssetFiles() {
    const files = [];
    const seen = new Set();

    function pushFile(file) {
        if (!file || !file.name || seen.has(file.name)) {
            return;
        }
        files.push(file);
        seen.add(file.name);
    }

    const commonRouteInput = document.getElementById('commonRouteFile');
    if (commonRouteInput?.files?.[0]) {
        pushFile(commonRouteInput.files[0]);
    }

    const underlayInput = document.getElementById('underlayImageFileName');
    if (underlayInput?.files?.[0]) {
        pushFile(underlayInput.files[0]);
    }

    mapFileEntries.forEach(entry => pushFile(entry.file));
    groupSettings.forEach(group => pushFile(group.routeFileUpload));

    return files;
}

async function uploadDataAssetsIfNeeded() {
    const files = collectDataAssetFiles();
    if (files.length === 0) {
        return { success: true, uploaded: [] };
    }

    const formData = new FormData();
    files.forEach(file => formData.append('files', file, file.name));

    const response = await fetch('/api/upload-data-files', {
        method: 'POST',
        body: formData
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload data assets');
    }

    return data;
}

function renderMapFileList() {
    const fileListContainer = document.getElementById('fileList');
    if (!fileListContainer) {
        return;
    }

    fileListContainer.innerHTML = '';
    mapFileEntries.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.textContent = entry.name;
        fileListContainer.appendChild(listItem);
    });
}

function getMapFileNames() {
    return mapFileEntries.map(entry => entry.name);
}

function getGroupCount() {
    return groupSettings.length;
}

function getTotalHostsFromGroups(defaultValue = 40) {
    const totalHosts = groupSettings.reduce((sum, group) => sum + (parseInt(group.numHosts, 10) || 0), 0);
    return totalHosts > 0 ? totalHosts : defaultValue;
}

function buildGroupConfigBlocks() {
    let content = '';

    groupSettings.forEach((group, index) => {
        const serial = index + 1;
        content += `
Group${serial}.groupID = ${group.groupID}
Group${serial}.nrofHosts = ${group.numHosts}
Group${serial}.movementModel = ${group.movementModel}
`;

        if (group.routeFile) {
            content += `
Group${serial}.routeFile = ${group.routeFile}
`;
        }

        content += `
Group${serial}.router = ${group.router}
`;

        if (group.routeType) {
            content += `
Group${serial}.routeType = ${group.routeType}
`;
        }

        if (group.waitTime) {
            content += `
Group${serial}.waitTime = ${group.waitTime}
`;
        }

        if (group.speed) {
            content += `
Group${serial}.speed = ${group.speed}
`;
        }

        if (group.bufferSize) {
            content += `
Group${serial}.bufferSize = ${group.bufferSize}
`;
        }

        content += `
Group${serial}.msgTtl = ${group.messageTTL}
`;

        if (group.activeTimes && group.activeTimes !== '0') {
            content += `
Group${serial}.activeTimes = ${group.activeTimes}

`;
        }
    });

    return content;
}


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

function resolveInterfaceIndex(interfaceRef) {
    if (typeof interfaceRef === 'number' && interfaceRef >= 0) {
        return interfaceRef;
    }

    if (typeof interfaceRef === 'string') {
        return interfaceSettings.findIndex(setting => setting.name === interfaceRef);
    }

    if (interfaceRef && typeof interfaceRef === 'object') {
        return interfaceSettings.findIndex(setting => setting === interfaceRef || setting.name === interfaceRef.name);
    }

    return -1;
}

function removeInterfaceSetting(interfaceRef) {
    const index = resolveInterfaceIndex(interfaceRef);
    if (index === -1) {
        return;
    }

    interfaceSettings.splice(index, 1);
    populateInterfaceTable();
    updateInterfaceTagifyWhitelist();
}

function removeInterface() {
    interfaceSettings.length = 0;
    populateInterfaceTable();
    updateInterfaceTagifyWhitelist();
}

function addInterface() {
    // Get the values from the form inputs
    const interfaceName = document.getElementById("interfaceName").value.trim();
    const interfaceType = document.getElementById("interfaceType").value;
    const transmitSpeed = document.getElementById("transmitSpeed").value.trim();
    const transmitRange = document.getElementById("transmitRange").value.trim();

    // Validate the inputs
    if (!interfaceName || !interfaceType || !transmitSpeed || !transmitRange) {
        alert("Please fill out all fields before adding an interface.");
        return;
    }

    if (interfaceSettings.some(setting => setting.name === interfaceName)) {
        alert(`Interface "${interfaceName}" already exists.`);
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
    populateInterfaceTable();

    // Clear the form inputs
    document.getElementById("newInterfaceForm").reset();
}

function editInterfaceSetting(interfaceRef) {
    const index = resolveInterfaceIndex(interfaceRef);
    if (index === -1) {
        return;
    }

    const setting = interfaceSettings[index];
    const newSpeed = prompt(`Edit Transmit Speed for ${setting.name}`, setting.transmitSpeed);
    const newRange = prompt(`Edit Transmit Range for ${setting.name}`, setting.transmitRange);
    if (newSpeed && newRange) {
        setting.transmitSpeed = newSpeed.trim();
        setting.transmitRange = newRange.trim();
    }
    populateInterfaceTable();
}


// Array to store events (pre-populated with default MessageEventGenerator)
// Note: 'hosts' field is overridden at save/run time with auto-calculated total host count
const events = [{
    eventClass: 'MessageEventGenerator',
    interval: '25,35',
    size: '500k,1M',
    hosts: '0,125',
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

function removeAllEvents() {
    events.length = 0;
    const eventTableBody = document.getElementById('eventList').getElementsByTagName('tbody')[0];
    eventTableBody.innerHTML = '';
}
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
    const groupID = document.getElementById("groupID").value.trim();
    const numHosts = parseInt(document.getElementById("numberOfHosts").value, 10);
    const movementModel = document.getElementById('Movement')?.value;
    const waitTimeMin = parseFloat(document.getElementById("waitTimeMin").value) || 0;
    const waitTimeMax = parseFloat(document.getElementById("waitTimeMax").value) || 0;
    const speedMin = parseFloat(document.getElementById("speedMin").value) || 0;
    const speedMax = parseFloat(document.getElementById("speedMax").value) || 0;
    const movementRouteType = parseInt(document.getElementById("movementRouteType").value, 10);
    const bufferSizeRaw = document.getElementById("bufferSize").value.trim();
    const router = document.getElementById("router").value;
    const msgTtl = document.getElementById("msgTtl").value || "infinite";
    const activeTimeStart1 = document.getElementById("activeTimeStart1").value;
    const routeFileInput = document.getElementById("groupRouteFile");
    const routeFileUpload = routeFileInput?.files?.[0] || null;
    const routeFile = getAssetRelativePathFromFile(routeFileUpload);

    if (!groupID) {
        alert("Group ID is required.");
        return;
    }

    if (movementModel === 'MapRouteMovement' && !routeFile) {
        alert("MapRouteMovement groups require a route file.");
        return;
    }

    if (groupSettings.some(group => group.groupID === groupID && group.routeFile === routeFile && group.router === router)) {
        alert(`A similar group entry for "${groupID}" already exists.`);
        return;
    }

    const hasWaitOverride = waitTimeMin || waitTimeMax;
    const hasSpeedOverride = speedMin || speedMax;
    const waitTime = hasWaitOverride ? `${waitTimeMin}, ${waitTimeMax}` : '';
    const speed = hasSpeedOverride ? `${speedMin}, ${speedMax}` : '';
    const bufferSize = bufferSizeRaw ? bufferSizeRaw : '';

    // Construct the new group object
    const newGroup = {
        groupID: groupID,
        numHosts: numHosts,
        movementModel: movementModel || "ShortestPathMapBasedMovement",
        routeFile: routeFile,
        routeFileUpload: routeFileUpload,
        routeType: movementRouteType,
        router: router,
        waitTime: waitTime,
        speed: speed,
        bufferSize: bufferSize,
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

function removeGroupSetting(index) {
    if (typeof index !== 'number' || index < 0 || index >= groupSettings.length) {
        return;
    }
    groupSettings.splice(index, 1);
    populateGroupTable();
}

function removeAllGroups() {
    groupSettings.length = 0;
    populateGroupTable();
}

// Function to edit group settings (as an example)
function editGroupSetting(group) {
    // Here you can prompt for new values or open a modal to edit group settings
    const newNumHosts = prompt(`Edit Number of Hosts for Group ${group.groupID}`, group.numHosts);
    const newMovementModel = prompt(`Edit Movement Model for Group ${group.groupID}`, group.movementModel);
    const newRouter = prompt(`Edit Router for Group ${group.groupID}`, group.router);
    const newWaitTime = prompt(`Edit Wait Time for Group ${group.groupID}`, group.waitTime || '');
    const newSpeed = prompt(`Edit Speed for Group ${group.groupID}`, group.speed || '');
    const newBufferSize = prompt(`Edit Buffer Size for Group ${group.groupID}`, group.bufferSize || '');
    const newRouteFile = prompt(`Edit Route File for Group ${group.groupID}`, group.routeFile || '');
    const newActiveTimes = prompt(`Edit Active Times for Group ${group.groupID}`, group.activeTimes);
    const newMessageTTL = prompt(`Edit Message TTL for Group ${group.groupID}`, group.messageTTL);

    if (newNumHosts && newMovementModel && newRouter && newActiveTimes && newMessageTTL) {
        group.numHosts = newNumHosts;
        group.movementModel = newMovementModel;
        group.router = newRouter;
        group.waitTime = newWaitTime || '';
        group.speed = newSpeed || '';
        group.bufferSize = newBufferSize || '';
        group.routeFile = newRouteFile || '';
        group.routeFileUpload = null;
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

    alert('Configuration imported successfully! Review the settings before simulation.');

    // Update batch preview to reflect imported values
    setTimeout(() => {
        if (typeof updateBatchPreview === 'function') {
            updateBatchPreview();
        }
    }, 100);
}


// Movement function
renderMapFileList();

// Event listener for file selection
document.getElementById("mapFiles").addEventListener("change", function (event) {
    let files = event.target.files; // Get the selected files

    // Loop through the selected files and add them to the in-memory list
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const existingIndex = mapFileEntries.findIndex(entry => entry.name === file.name);
        if (existingIndex === -1) {
            mapFileEntries.push({ name: file.name, file: file });
        } else {
            mapFileEntries[existingIndex] = { name: file.name, file: file };
        }
    }

    renderMapFileList();

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

// Event listener for the "Browse" button - uses DirectoryBrowser for real filesystem paths
browseDirButton.addEventListener("click", () => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'dirBrowserOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:white;border-radius:12px;padding:24px;width:700px;max-height:80vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
    header.innerHTML = '<h3 style="margin:0;color:#1f2937;">Select Report Directory</h3>';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;';
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);
    modal.appendChild(header);

    const browserContainer = document.createElement('div');
    browserContainer.id = 'reportDirBrowserContainer';
    modal.appendChild(browserContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // Initialize DirectoryBrowser with callback
    const browser = new DirectoryBrowser('reportDirBrowserContainer', {
        initialPath: reportDirectory || '',
        filterType: 'dirs',
        onSelectPath: (selectedPath) => {
            // Ensure path ends with separator
            const normalizedPath = selectedPath.endsWith('/') || selectedPath.endsWith('\\')
                ? selectedPath : selectedPath + '/';
            reportDirInput.value = normalizedPath;
            reportDirectory = normalizedPath;
            // Also sync the analysis report dir hidden field
            const analysisReportDir = document.getElementById('analysisReportDir');
            if (analysisReportDir) analysisReportDir.value = normalizedPath;
            overlay.remove();
            showSaveStatus(`Report directory set to: ${normalizedPath}`, true);
        }
    });
});

// Event listener for the "Add Report" button
addReportButton.addEventListener("click", addReport);

// Event listener for the global warmup input
reportWarmupInput.addEventListener("change", (event) => {
    reportWarmup = parseInt(event.target.value, 10) || 0; // Update the global warmup time
});

// Example: Preload default reports
// Example: Preload default reports
reports.push("MessageStatsReport");
reports.push("ContactTimesReport");
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
    if (evt && evt.currentTarget) {
        evt.currentTarget.className += " active";
    }
}
let batchNum;
// Function to generate and download the settings file based on the tab
async function saveAllSettings() {
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
    // Build Scenario.name dynamically from Pattern Builder
    let scenarioNameTemplate;
    if (window.patternBuilder && window.patternBuilder.patternNames.length > 0) {
        scenarioNameTemplate = window.patternBuilder.getScenarioNameTemplate(name);
    } else {
        // Fallback: basic template without pattern builder
        scenarioNameTemplate = `${name}_%%Group.router%%_%%MovementModel.rngSeed%%_%%Group.msgTtl%%`;
    }
    content += `
## Scenario settings
Scenario.name = ${scenarioNameTemplate}

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
    const routerValues = getTagifyInputValues("commonRouter", ['EpidemicRouter']);
    const CommoNrouter = `[${routerValues.join("; ")}]`;
    const routerCount = routerValues.length;

    // Handle buffer size - support multiple values like "5M; 10M; 20M"
    let CommoNbufferSize = document.getElementById("commonBufferSize").value;
    let bufferLen = calculateBatchSize(CommoNbufferSize);
    if (CommoNbufferSize.includes(";")) {
        CommoNbufferSize = `[${CommoNbufferSize}]`;
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

    TTLLen = calculateBatchSize(CommoNmsgTtl);

    content += `
Scenario.nrofHostGroups = ${getGroupCount()}
        `;
    // Collecting Common group Data
    content += `
## Common settings for all groups:
Group.movementModel = ${CommoNmovementModel}
Group.router = ${CommoNrouter}
Group.bufferSize = ${CommoNbufferSize}`
    const commonRouteFileValue = getNormalizedDataFileValue(commonRouteFile);
    if (commonRouteFileValue) {
        content += `
Group.routeFile = ${commonRouteFileValue}
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
    content += buildGroupConfigBlocks();
    // Event - auto-calculate total hosts from group table
    let totalHosts = getTotalHostsFromGroups(parseInt(CommoNnumHosts) || 40);

    content += `
## Event settings
Events.nrof = ${events.length}`
    let count = 1;
    for (let row of events) {

        // Use auto-calculated host range instead of user-typed value
        const eventHosts = `0,${totalHosts - 1}`;

        content += `
Events${count}.class = ${row['eventClass']}
Events${count}.interval =${row['interval']}
Events${count}.size =${row['size']}
Events${count}.hosts = ${eventHosts}
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
    content += `
## Map based movement -movement model specific settings
MapBasedMovement.nrofMapFiles = ${getMapFileNames().length}
`;
    const mapFileNames = getMapFileNames();
    if (mapFileNames.length > 0) {
        let mapFileIndex = 1;
        for (let fileName of mapFileNames) {
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
    // Retrieve values from the form (safe fallbacks for elements that may not exist)
    const prophetRouterTimeUnit = document.getElementById('prophetRouterTimeUnit')?.value || '30';
    const sprayAndWaitCopies = document.getElementById('sprayAndWaitCopies')?.value || '6';
    const sprayAndWaitBinaryMode = document.getElementById('sprayAndWaitBinaryMode')?.checked ?? true;
    const optimizationCellSizeMult = document.getElementById('optimizationCellSizeMult')?.value || '5';
    const optimizationRandomizeUpdateOrder = document.getElementById('optimizationRandomizeUpdateOrder')?.checked ?? true;

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

    // GUI Tab (safe fallbacks for elements that may not exist)

    const underlayImageOffset = document.getElementById('underlayImageOffset')?.value || '64, 20';
    const underlayImageScale = document.getElementById('underlayImageScale')?.value || '4.75';
    const underlayImageRotate = document.getElementById('underlayImageRotate')?.value || '-0.015';
    const eventLogPanelNrofEvents = document.getElementById('eventLogPanelNrofEvents')?.value || '100';
    const fileInput = document.getElementById('underlayImageFileName');
    let file = 'helsinki_underlay.png';
    if (fileInput && fileInput.value && fileInput.files && fileInput.files[0]) {
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
    let settingsFilename = sanitizeFilenameBase(name) + '_settings.txt';
    if (document.getElementById("nameAdd").checked) {
        settingsFilename = sanitizeFilenameBase(name) + '_settings.txt';
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

    // Averager config (batch processing)
    payload.averager = collectBatchConfig();

    // Regression config
    payload.regression = collectRegressionConfig();

    try {
        await uploadDataAssetsIfNeeded();
    } catch (error) {
        console.error('Asset upload error:', error);
        alert('Failed to upload data assets: ' + error.message);
        return;
    }

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
        scenario_name: document.getElementById('scenarioName')?.value || 'default_scenario',
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
            delimiter: window.patternBuilder?.delimiter || document.getElementById('analysisFilenameDelimiter')?.value || '_',
            average_files: {
                report_type_position: parseInt(document.getElementById('analysisReportTypePos')?.value) || 0,
                router_position: parseInt(document.getElementById('analysisRouterPos')?.value) || 1,
                grouping_type_position: parseInt(document.getElementById('analysisGroupingTypePos')?.value) || -1
            },
            raw_files: (window.patternBuilder && window.patternBuilder.patternNames.length > 0) ? {
                positions: (() => {
                    const positions = {};
                    window.patternBuilder.patternNames.forEach((name, index) => {
                        // Map pattern builder names to analysis config names
                        const mappedName = name === 'scenario' ? 'prefix' :
                            name === 'reports' ? 'report_type' : name;
                        positions[mappedName] = index;
                    });
                    return positions;
                })()
            } : undefined
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

    // Collect dynamic filename pattern components from Pattern Builder
    const components = {};
    if (window.patternBuilder && window.patternBuilder.patternNames) {
        // Get pattern from the visual Pattern Builder
        window.patternBuilder.patternNames.forEach((name, index) => {
            components[name] = index;
        });
    } else {
        // Fallback: read from the table (legacy)
        const componentRows = document.querySelectorAll('#batchComponentsBody tr');
        componentRows.forEach(row => {
            const nameInput = row.querySelector('input[data-field="name"]');
            const posInput = row.querySelector('input[data-field="position"]');
            if (nameInput && posInput && nameInput.value.trim()) {
                components[nameInput.value.trim()] = parseInt(posInput.value) || 0;
            }
        });
    }

    // Collect dynamic average groups
    const averageGroups = [];
    const groupRows = document.querySelectorAll('#batchAverageGroupsBody tr');
    groupRows.forEach(row => {
        const nameInput = row.querySelector('input[data-field="name"]');
        const groupByInput = row.querySelector('input[data-field="groupBy"]');
        const minFilesInput = row.querySelector('input[data-field="minFiles"]');

        if (nameInput && groupByInput && nameInput.value.trim()) {
            // Get Tagify values if available
            let groupByArray = [];
            if (groupByInput.tagify && groupByInput.tagify.value) {
                groupByArray = groupByInput.tagify.value.map(tag => tag.value);
            } else {
                // Fallback: try to parse Tagify JSON format or comma-separated values
                const groupByStr = groupByInput.value.trim();
                if (groupByStr.startsWith('[')) {
                    // Tagify JSON format
                    try {
                        const parsed = JSON.parse(groupByStr);
                        groupByArray = parsed.map(item => typeof item === 'object' ? item.value : item);
                    } catch (e) {
                        groupByArray = [];
                    }
                } else {
                    // Comma-separated values
                    groupByArray = groupByStr ? groupByStr.split(',').map(s => s.trim()).filter(s => s) : [];
                }
            }

            // Auto-generate output_template
            let templateParts = ['{report_type}'];
            groupByArray.forEach(field => {
                if (field !== 'report_type') {
                    templateParts.push(`{${field}}`);
                }
            });
            const safeName = nameInput.value.trim() || 'average';
            templateParts.push(`${safeName}.txt`);
            const outputTemplate = templateParts.join('_');

            averageGroups.push({
                name: safeName,
                group_by: groupByArray,
                min_files: parseInt(minFilesInput?.value) || 2,
                output_template: outputTemplate
            });
        }
    });

    return {
        scenario_name: document.getElementById('scenarioName')?.value || 'default_scenario',
        folder: document.getElementById('batchFolder')?.value || 'reportQP',
        file_filter: {
            extension: document.getElementById('batchExtension')?.value || '.txt'
        },
        filename_pattern: {
            delimiter: window.patternBuilder?.delimiter || '_',
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
    const targets = getRegressionTargets();

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
            target: targets[0] || 'delivery_prob',
            targets: targets,
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


async function saveDefaultSettings() {
    console.log("Save Default Settings triggered");
    let content = '';

    // ============================================================
    // Dynamically build settings from current GUI form values
    // (mirrors saveAllSettings logic, uses PatternBuilder for Scenario.name)
    // ============================================================

    // Scenario Tab
    let name = document.getElementById("scenarioName").value;
    // Build Scenario.name dynamically from Pattern Builder
    let scenarioNameTemplate;
    if (window.patternBuilder && window.patternBuilder.patternNames.length > 0) {
        scenarioNameTemplate = window.patternBuilder.getScenarioNameTemplate(name);
    } else {
        // Fallback: basic template without pattern builder
        scenarioNameTemplate = `${name}_%%Group.router%%_%%MovementModel.rngSeed%%_%%Group.msgTtl%%`;
    }

    content += `#
# Default settings for the simulation
#

## Scenario settings
Scenario.name = ${scenarioNameTemplate}
Scenario.simulateConnections = ${document.getElementById("simulateConnections").checked ? "true" : "false"}
Scenario.updateInterval = ${document.getElementById("updateInterval").value}
Scenario.endTime = ${document.getElementById("endTime").value}
`;

    // Interface Table Data
    content += `\n## Interface-specific settings:\n`;
    const interfaceTableRows = document.getElementById("interfaceList").getElementsByTagName("tbody")[0].rows;
    for (let row of interfaceTableRows) {
        const interfaceName = row.cells[0].innerText;
        const interfaceType = row.cells[1].innerText;
        const transmitSpeed = row.cells[2].innerText;
        const transmitRange = row.cells[3].innerText;
        content += `\n${interfaceName}.type = ${interfaceType}\n`;
        content += `${interfaceName}.transmitSpeed = ${transmitSpeed}\n`;
        content += `${interfaceName}.transmitRange = ${transmitRange}\n`;
    }

    // Common group settings
    const CommoNmovementModel = document.getElementById("commonMovementModel").value;
    const CommoNrouter = getRouterConfigValue();
    let CommoNbufferSize = document.getElementById("commonBufferSize").value;
    const CommoNwaitTime = document.getElementById("commonWaitTime").value;
    const CommoNspeed = document.getElementById("commonSpeed").value;
    let CommoNmsgTtl = document.getElementById("commonTtl").value;
    const CommoNnumHosts = document.getElementById("commonNumberOfHost").value;

    if (CommoNbufferSize.includes(";")) {
        CommoNbufferSize = `[${CommoNbufferSize}]`;
    }
    if (CommoNmsgTtl.includes(";")) {
        CommoNmsgTtl = `[${CommoNmsgTtl}]`;
    }

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

    content += `\nScenario.nrofHostGroups = ${getGroupCount()}\n`;

    content += `\n## Common settings for all groups\n`;
    content += `Group.movementModel = ${CommoNmovementModel}\n`;
    content += `Group.router = ${CommoNrouter}\n`;
    content += `Group.bufferSize = ${CommoNbufferSize}\n`;
    const commonRouteFile = document.getElementById("commonRouteFile");
    const commonRouteFileValue = getNormalizedDataFileValue(commonRouteFile);
    if (commonRouteFileValue) {
        content += `Group.routeFile = ${commonRouteFileValue}\n`;
    }
    content += `Group.waitTime = ${CommoNwaitTime}\n`;
    content += `Group.nrofInterfaces = ${interfaces.length}\n`;
    interfaces.forEach((iface, idx) => {
        content += `Group.interface${idx + 1} = ${iface}\n`;
    });
    content += `Group.speed = ${CommoNspeed}\n`;
    content += `Group.msgTtl = ${CommoNmsgTtl}\n`;
    content += `Group.nrofHosts = ${CommoNnumHosts}\n`;

    content += buildGroupConfigBlocks();

    // Event settings - auto-calculate total hosts from group table
    let totalHostsForEvents = getTotalHostsFromGroups(parseInt(CommoNnumHosts) || 40);
    content += `\n## Event settings\n`;
    content += `Events.nrof = ${events.length}\n`;
    let count = 1;
    for (let row of events) {
        // Use auto-calculated host range instead of user-typed value
        const eventHosts = `0,${totalHostsForEvents - 1}`;
        content += `Events${count}.class = ${row['eventClass']}\n`;
        content += `Events${count}.interval = ${row['interval']}\n`;
        content += `Events${count}.size = ${row['size']}\n`;
        content += `Events${count}.hosts = ${eventHosts}\n`;
        content += `Events${count}.prefix = ${row['prefix']}\n`;
        count++;
    }

    // Movement model settings
    let rngSeed = document.getElementById("rngSeed").value || "1";
    if (rngSeed.includes(";")) {
        rngSeed = `[${rngSeed}]`;
    }
    const worldSize = document.getElementById("worldSize").value || "4500, 3400";
    const warmupTime = document.getElementById("warmup").value || "1000";
    content += `\n## Movement model settings\n`;
    content += `MovementModel.rngSeed = ${rngSeed}\n`;
    content += `MovementModel.worldSize = ${worldSize}\n`;
    content += `MovementModel.warmup = ${warmupTime}\n`;

    // Map Files
    content += `\n## Map based movement settings\n`;
    const mapFileNames = getMapFileNames();
    content += `MapBasedMovement.nrofMapFiles = ${mapFileNames.length}\n`;
    if (mapFileNames.length > 0) {
        let mapFileIndex = 1;
        for (let fileName of mapFileNames) {
            content += `MapBasedMovement.mapFile${mapFileIndex} = data/${fileName}\n`;
            mapFileIndex++;
        }
    }

    // Reports
    content += `\n## Reports\n`;
    content += `Report.nrofReports = ${reports.length}\n`;
    content += `Report.warmup = ${reportWarmup}\n`;
    content += `Report.reportDir = ${reportDirectory}\n`;
    reports.forEach((reportClass, index) => {
        content += `Report.report${index + 1} = ${reportClass}\n`;
    });

    // Router & Optimization settings (use safe fallbacks - these elements may not exist in UI yet)
    const prophetRouterTimeUnit = document.getElementById('prophetRouterTimeUnit')?.value || '30';
    const sprayAndWaitCopies = document.getElementById('sprayAndWaitCopies')?.value || '6';
    const sprayAndWaitBinaryMode = document.getElementById('sprayAndWaitBinaryMode')?.checked ?? true;
    const optimizationCellSizeMult = document.getElementById('optimizationCellSizeMult')?.value || '5';
    const optimizationRandomizeUpdateOrder = document.getElementById('optimizationRandomizeUpdateOrder')?.checked ?? true;

    content += `\n## Default settings for some routers\n`;
    content += `ProphetRouter.secondsInTimeUnit = ${prophetRouterTimeUnit}\n`;
    content += `SprayAndWaitRouter.nrofCopies = ${sprayAndWaitCopies}\n`;
    content += `SprayAndWaitRouter.binaryMode = ${sprayAndWaitBinaryMode}\n`;
    content += `\n## Optimization settings\n`;
    content += `Optimization.cellSizeMult = ${optimizationCellSizeMult}\n`;
    content += `Optimization.randomizeUpdateOrder = ${optimizationRandomizeUpdateOrder}\n`;

    // GUI settings (use safe fallbacks - these elements may not exist in UI yet)
    const underlayImageOffset = document.getElementById('underlayImageOffset')?.value || '64, 20';
    const underlayImageScale = document.getElementById('underlayImageScale')?.value || '4.75';
    const underlayImageRotate = document.getElementById('underlayImageRotate')?.value || '-0.015';
    const eventLogPanelNrofEvents = document.getElementById('eventLogPanelNrofEvents')?.value || '100';
    const fileInput = document.getElementById('underlayImageFileName');
    let file = 'helsinki_underlay.png';
    if (fileInput && fileInput.value && fileInput.files && fileInput.files[0]) {
        file = fileInput.files[0].name;
    }
    content += `\n## GUI settings\n`;
    content += `GUI.UnderlayImage.fileName = ${'data/' + file}\n`;
    content += `GUI.UnderlayImage.offset = ${underlayImageOffset}\n`;
    content += `GUI.UnderlayImage.scale = ${underlayImageScale}\n`;
    content += `GUI.UnderlayImage.rotate = ${underlayImageRotate}\n`;
    content += `GUI.EventLogPanel.nrofEvents = ${eventLogPanelNrofEvents}\n`;

    try {
        await uploadDataAssetsIfNeeded();
    } catch (error) {
        console.error('Asset upload error:', error);
        alert('Failed to upload data assets: ' + error.message);
        return;
    }

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

async function runONE() {
    // Auto-detect batch mode based on settings
    const routerInput = document.getElementById("commonRouter");
    let routerCount = 1;
    try {
        routerCount = getTagifyInputValues(routerInput, ['EpidemicRouter']).length;
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
    const enableML = document.getElementById("enableML")?.checked || false;

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
    // Build Scenario.name dynamically from Pattern Builder
    let scenarioNameTemplate;
    if (window.patternBuilder && window.patternBuilder.patternNames.length > 0) {
        scenarioNameTemplate = window.patternBuilder.getScenarioNameTemplate(name);
    } else {
        // Fallback: basic template without pattern builder
        scenarioNameTemplate = `${name}_%%Group.router%%_%%MovementModel.rngSeed%%_%%Group.msgTtl%%`;
    }
    content += `
## Scenario settings
Scenario.name = ${scenarioNameTemplate}

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
    const CommoNrouter = getRouterConfigValue();
    // routerCount already computed above for batch mode detection
    let CommoNbufferSize = document.getElementById("commonBufferSize").value;
    // Handle buffer size batch mode
    let bufferLen = calculateBatchSize(CommoNbufferSize);
    if (CommoNbufferSize.includes(";")) {
        CommoNbufferSize = `[${CommoNbufferSize}]`;
    }
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
    TTLLen = calculateBatchSize(CommoNmsgTtl);

    content += `
Scenario.nrofHostGroups = ${getGroupCount()}
        `;
    content += `
## Common settings for all groups:
Group.movementModel = ${CommoNmovementModel}
Group.router = ${CommoNrouter}
Group.bufferSize = ${CommoNbufferSize}`;
    const commonRouteFileValue = getNormalizedDataFileValue(commonRouteFile);
    if (commonRouteFileValue) {
        content += `
Group.routeFile = ${commonRouteFileValue}
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

    content += buildGroupConfigBlocks();

    // Event settings - auto-calculate total hosts from group table
    let totalHostsForEvents = getTotalHostsFromGroups(parseInt(CommoNnumHosts) || 40);

    content += `
## Event settings
Events.nrof = ${events.length}`
    let count = 1;
    for (let row of events) {

        // Use auto-calculated host range instead of user-typed value
        const eventHosts = `0,${totalHostsForEvents - 1}`;

        content += `
Events${count}.class = ${row['eventClass']}
Events${count}.interval =${row['interval']}
Events${count}.size =${row['size']}
Events${count}.hosts = ${eventHosts}
Events${count}.prefix = ${row['prefix']}
    `;
        count++;
    }

    // RNG Seed
    let rngSeed = document.getElementById("rngSeed").value || "1";
    if (rngSeed.includes(";")) {
        rngSeed = `[${rngSeed}]`;
    }
    let rngSeedLen = calculateBatchSize(rngSeed);

    // Calculate batch number (routers × seeds × TTLs × buffers)
    batchNum = routerCount * rngSeedLen * TTLLen * bufferLen;

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
    content += `
## Map based movement -movement model specific settings
MapBasedMovement.nrofMapFiles = ${getMapFileNames().length}
`;
    const mapFileNames = getMapFileNames();
    if (mapFileNames.length > 0) {
        let mapFileIndex = 1;
        for (let fileName of mapFileNames) {
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

    // Router & Optimization Tab (safe fallbacks for elements that may not exist)
    const prophetRouterTimeUnit = document.getElementById('prophetRouterTimeUnit')?.value || '30';
    const sprayAndWaitCopies = document.getElementById('sprayAndWaitCopies')?.value || '6';
    const sprayAndWaitBinaryMode = document.getElementById('sprayAndWaitBinaryMode')?.checked ?? true;
    const optimizationCellSizeMult = document.getElementById('optimizationCellSizeMult')?.value || '5';
    const optimizationRandomizeUpdateOrder = document.getElementById('optimizationRandomizeUpdateOrder')?.checked ?? true;

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

    // GUI Tab (safe fallbacks for elements that may not exist)
    const underlayImageOffset = document.getElementById('underlayImageOffset')?.value || '64, 20';
    const underlayImageScale = document.getElementById('underlayImageScale')?.value || '4.75';
    const underlayImageRotate = document.getElementById('underlayImageRotate')?.value || '-0.015';
    const eventLogPanelNrofEvents = document.getElementById('eventLogPanelNrofEvents')?.value || '100';
    const fileInput = document.getElementById('underlayImageFileName');
    let file = 'helsinki_underlay.png';
    if (fileInput && fileInput.value && fileInput.files && fileInput.files[0]) {
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
    let settingsFilename = sanitizeFilenameBase(name) + '_settings.txt';

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

    try {
        await uploadDataAssetsIfNeeded();
    } catch (error) {
        console.error("Asset upload error:", error);
        logError(`Asset upload error: ${error.message}`);
        showSaveStatus('✗ Asset upload failed', false);
        return;
    }

    // ============================================================
    // STEP 4: Send to backend /api/run-one endpoint
    // ============================================================
    // Show console and start logging
    showConsole();
    clearConsole();

    logStep('🚀 Starting Complete Simulation Pipeline');
    logInfo(`Config file: ${settingsFilename}`);
    logInfo(`Mode: ${batchMode ? 'Batch (' + batchNum + ' runs)' : 'GUI Mode'}`);
    logInfo(`Post-processing: Enabled`);
    addDivider();

    logStep('⏳ Saving settings and starting simulation...');

    // Show stop button, disable run button
    const runBtn = document.getElementById('runButton');
    const stopBtn = document.getElementById('stopSimButton');
    if (runBtn) runBtn.disabled = true;
    if (stopBtn) stopBtn.style.display = 'block';

    // Use fetch with streaming for SSE response from POST
    fetch("/api/run-one", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })
        .then((response) => {
            // Check if response is SSE stream
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/event-stream')) {
                // Handle SSE stream from POST response
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                function processStream() {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            addDivider();
                            showSaveStatus('✓ Stream ended', true);
                            return;
                        }

                        buffer += decoder.decode(value, { stream: true });

                        // Process complete SSE messages
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line in buffer

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    handleStreamEvent(data);
                                } catch (e) {
                                    // Not valid JSON, ignore
                                }
                            }
                        }

                        processStream(); // Continue reading
                    }).catch((error) => {
                        console.error('Stream error:', error);
                        logError(`Stream error: ${error.message}`);
                        showSaveStatus('✗ Stream error', false);
                    });
                }

                processStream();
            } else {
                // Handle regular JSON response (error case)
                return response.json().then((data) => {
                    if (!data.success) {
                        addDivider();
                        logError(`Pipeline error: ${data.message}`);
                        showSaveStatus('✗ Pipeline failed', false);
                    }
                });
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            logError(`Network error: ${error.message}`);
            showSaveStatus('✗ Pipeline error', false);
            resetProcessButtons();
        });
}

/**
 * Handle a streaming SSE event from the simulation
 */
function handleStreamEvent(data) {
    switch (data.type) {
        case 'info':
            logInfo(data.message);
            break;
        case 'step':
            logStep(data.message);
            break;
        case 'log':
            // Map backend level to frontend function
            switch (data.level) {
                case 'error':
                    logError(data.message);
                    break;
                case 'warning':
                    logWarning(data.message);
                    break;
                case 'success':
                    logSuccess(data.message);
                    break;
                case 'step':
                    logStep(data.message);
                    break;
                default:
                    logOutput(data.message);
            }
            break;
        case 'complete':
            addDivider();
            if (data.success) {
                logSuccess(`🎉 ${data.message}`);
                showSaveStatus('✓ Simulation complete', true);
            } else {
                logError(`✗ ${data.message}`);
                showSaveStatus('✗ Simulation failed', false);
            }
            break;
        case 'error':
            logError(data.message);
            break;
        case 'end':
            // Stream ended — reset buttons
            resetProcessButtons();
            break;
    }
}

// ============================================================
// PROCESS TERMINATION
// ============================================================

/**
 * Terminate a running simulation or post-processing process
 * @param {string} target - 'simulation', 'post_processing', or 'all'
 */
function terminateProcess(target = 'all') {
    logWarning(`Terminating ${target === 'all' ? 'all processes' : target}...`);

    fetch('/api/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                logWarning(`⛔ ${data.message}`);
                showSaveStatus('Process terminated', false);
            } else {
                logError(`Terminate failed: ${data.message}`);
            }
            // Reset buttons
            resetProcessButtons();
        })
        .catch(error => {
            logError(`Terminate error: ${error.message}`);
            resetProcessButtons();
        });
}

/**
 * Reset run/stop button states after process ends
 */
function resetProcessButtons() {
    const runBtn = document.getElementById('runButton');
    const stopSimBtn = document.getElementById('stopSimButton');
    const runAllPPBtn = document.getElementById('runAllPPButton');
    const stopPPBtn = document.getElementById('stopPPButton');

    if (runBtn) runBtn.disabled = false;
    if (stopSimBtn) stopSimBtn.style.display = 'none';
    if (runAllPPBtn) runAllPPBtn.disabled = false;
    if (stopPPBtn) stopPPBtn.style.display = 'none';
}

// ============================================================
// POST-PROCESSING CONFIG MANAGEMENT
// ============================================================

// Tagify instances for post-processing fields
let metricsIncludeTagify, metricsIgnoreTagify, enabledPlotsTagify, predictorsTagify, enabledModelsTagify;
let reportTypesTagify, batchIgnoreFieldsTagify, regressionExcludeTagify, regressionTargetTagify;

// Available options for Tagify dropdowns (defaults, overwritten by gui_options.json)
let AVAILABLE_METRICS = [
    "delivery_prob", "latency_avg", "latency_med", "overhead_ratio",
    "hopcount_avg", "hopcount_med", "buffertime_avg", "buffertime_med",
    "rtt_avg", "rtt_med", "sim_time", "created", "started", "relayed",
    "aborted", "dropped", "removed", "delivered", "delivery_ratio",
    "oppo_cahce_hit", "static_cache_hit", "drop_pit", "duplicated_query"
];

let AVAILABLE_PLOTS = [
    "line_plots", "3d_surface", "violin_plots", "heatmaps", "pairplot", "export_csv"
];

let AVAILABLE_MODELS = [
    "Linear Regression", "Ridge Regression", "Lasso Regression",
    "Decision Tree", "Random Forest", "Gradient Boosting", "KNN"
];

let AVAILABLE_PREDICTORS = [
    "BufferSize", "TTL", "overhead_ratio", "hopcount_avg", "latency_avg",
    "buffertime_avg", "rtt_avg", "created", "delivered", "relayed",
    "oppo_cahce_hit", "static_cache_hit", "drop_pit", "duplicated_query"
];

let AVAILABLE_REPORT_TYPES = [
    "MessageStatsReport", "CreatedMessagesReport",
    "DeliveredMessagesReport", "BufferOccupancyReport"
];

// ============================================================
// CENTRALIZED CONFIG LOADER
// Load GUI options from config/gui_options.json via API
// ============================================================

/**
 * Populate a <select> element with options from an array.
 * Preserves the current selection if it exists in the new list.
 */
function populateSelectFromConfig(selectId, optionValues) {
    const select = document.getElementById(selectId);
    if (!select || !optionValues || optionValues.length === 0) return;

    const currentValue = select.value;
    select.innerHTML = '';

    optionValues.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        // Create human-readable label: insert spaces before capitals
        option.textContent = value.replace(/([A-Z])/g, ' $1').trim();
        select.appendChild(option);
    });

    // Restore previous selection if still valid
    if (currentValue && optionValues.includes(currentValue)) {
        select.value = currentValue;
    }
}

/**
 * Load centralized GUI options from the backend and update all
 * dropdowns, Tagify whitelists, and default data.
 * Falls back gracefully to hardcoded defaults on error.
 */
async function loadGUIOptions() {
    try {
        const response = await fetch('/api/gui-options');
        if (!response.ok) {
            console.warn('Could not load gui_options.json, using defaults');
            return;
        }
        const options = await response.json();
        window.guiOptions = options;

        // --- Update AVAILABLE_* arrays ---
        if (options.metrics && options.metrics.length > 0) {
            AVAILABLE_METRICS = options.metrics;
        }
        if (options.plots && options.plots.length > 0) {
            AVAILABLE_PLOTS = options.plots;
        }
        if (options.models && options.models.length > 0) {
            AVAILABLE_MODELS = options.models;
        }
        if (options.predictors && options.predictors.length > 0) {
            AVAILABLE_PREDICTORS = options.predictors;
        }
        if (options.report_types && options.report_types.length > 0) {
            AVAILABLE_REPORT_TYPES = options.report_types;
        }

        // --- Update Tagify whitelists if already initialized ---
        if (metricsIncludeTagify) metricsIncludeTagify.settings.whitelist = AVAILABLE_METRICS;
        if (metricsIgnoreTagify) metricsIgnoreTagify.settings.whitelist = AVAILABLE_METRICS;
        if (enabledPlotsTagify) enabledPlotsTagify.settings.whitelist = AVAILABLE_PLOTS;
        if (enabledModelsTagify) enabledModelsTagify.settings.whitelist = AVAILABLE_MODELS;
        if (predictorsTagify) predictorsTagify.settings.whitelist = AVAILABLE_PREDICTORS;
        if (reportTypesTagify) reportTypesTagify.settings.whitelist = AVAILABLE_REPORT_TYPES;
        if (regressionTargetTagify) regressionTargetTagify.settings.whitelist = AVAILABLE_METRICS;

        // --- Populate <select> dropdowns ---
        if (options.routers && options.routers.length > 0) {
            // Router select in group editor
            populateSelectFromConfig('router', options.routers);
            // Router Tagify whitelist (common router input)
            if (window.routerTagify) {
                window.routerTagify.settings.whitelist = options.routers;
            }
        }
        if (options.movement_models && options.movement_models.length > 0) {
            populateSelectFromConfig('commonMovementModel', options.movement_models);
            populateSelectFromConfig('Movement', options.movement_models);
        }

        // --- Update default group settings ---
        if (options.default_groups && options.default_groups.length > 0) {
            // Only update if group table hasn't been modified by user yet
            const currentTable = document.getElementById('groupSettingsBody');
            if (currentTable && currentTable.rows.length === 0) {
                groupSettings = options.default_groups.map(g => ({
                    ...g,
                    actions: 'Edit/Delete'
                }));
            }
        }

        // --- Update Pattern Builder ONE placeholders ---
        if (options.one_placeholders && window.patternBuilder) {
            window.patternBuilder._onePlaceholders = options.one_placeholders;
        }

        console.log('✓ GUI options loaded from config/gui_options.json');
    } catch (error) {
        console.warn('Failed to load GUI options:', error.message);
    }
}

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
function addBatchAverageGroup(name = '', groupBy = '', minFiles = 2) {
    const tbody = document.getElementById('batchAverageGroupsBody');
    if (!tbody) return;

    const groupByStr = Array.isArray(groupBy) ? groupBy.join(', ') : groupBy;

    const row = document.createElement('tr');
    const uniqueId = 'groupByTagify_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    row.innerHTML = `
        <td><input type="text" data-field="name" value="${name}" placeholder="e.g., ttl_group"></td>
        <td><input type="text" id="${uniqueId}" data-field="groupBy" value="${groupByStr}" placeholder="Select pattern names..." style="width: 100%;"></td>
        <td><input type="number" data-field="minFiles" value="${minFiles}" min="1" style="width: 60px;"></td>
        <td>
            <button type="button" class="remove-button" onclick="removeDynamicRow(this)" style="padding: 4px 8px;">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(row);

    // Initialize Tagify for this row's group by field
    const tagifyInput = document.getElementById(uniqueId);
    if (tagifyInput) {
        setTimeout(() => {
            initializeGroupByTagify(tagifyInput);
        }, 0);
    }
}

function initializeGroupByTagify(inputElement) {
    // Get pattern names from Pattern Builder
    let patternNames = [];
    if (typeof patternBuilder !== 'undefined' && patternBuilder.getPatternData) {
        const patternData = patternBuilder.getPatternData();
        patternNames = patternData.names || [];
    }

    // Initialize Tagify if not already initialized
    if (!inputElement.tagify) {
        const tagify = new Tagify(inputElement, {
            whitelist: patternNames,
            enforceWhitelist: true,
            dropdown: {
                maxItems: 20,
                enabled: patternNames.length > 0 ? 1 : 0,
                closeOnSelect: false
            },
            placeholder: 'Select pattern names from builder...'
        });
        // Store the Tagify instance on the element for later access
        inputElement.tagify = tagify;
    }
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
let autoSaveInitialized = false;

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
    return postConfig('analysis', collectAnalysisConfig())
        .then(data => data.success)
        .catch(() => false);
}

function saveBatchConfigSilent() {
    return postConfig('averager', collectBatchConfig())
        .then(data => data.success)
        .catch(() => false);
}

function saveRegressionConfigSilent() {
    return postConfig('regression', collectRegressionConfig())
        .then(data => data.success)
        .catch(() => false);
}

// Setup auto-save listeners on all post-processing form inputs
function setupAutoSave() {
    const postProcessingDiv = document.getElementById('PostProcessing');
    if (!postProcessingDiv || autoSaveInitialized) return;

    const delegatedAutoSave = (event) => {
        if (event.target && event.target.matches('input, select, textarea')) {
            autoSaveConfigs();
        }
    };

    postProcessingDiv.addEventListener('change', delegatedAutoSave);
    postProcessingDiv.addEventListener('input', delegatedAutoSave);
    autoSaveInitialized = true;

    console.log('Auto-save enabled with delegated listeners');
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
    postConfig('analysis', collectAnalysisConfig())
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

// Batch Config (uses averager config file)
function loadBatchConfig() {
    fetch('/api/config/averager')
        .then(response => response.json())
        .then(config => {
            if (config.error) {
                console.error('Error loading batch config:', config.error);
                return;
            }
            const batchFolderEl = document.getElementById('batchFolder');
            const batchExtensionEl = document.getElementById('batchExtension');
            const batchDataSeparatorEl = document.getElementById('batchDataSeparator');
            const batchPrecisionEl = document.getElementById('batchPrecision');

            if (batchFolderEl) batchFolderEl.value = config.folder || '';
            if (batchExtensionEl) batchExtensionEl.value = config.file_filter?.extension || '.txt';
            if (batchDataSeparatorEl) batchDataSeparatorEl.value = config.data_separator || ':';
            if (batchPrecisionEl) batchPrecisionEl.value = config.output?.precision || 4;

            // Ignore fields using Tagify
            if (batchIgnoreFieldsTagify && config.ignore_fields) {
                batchIgnoreFieldsTagify.removeAllTags();
                batchIgnoreFieldsTagify.addTags(config.ignore_fields);
            }

            // Advanced Settings - Filename Pattern Components
            // Update both the old table AND the new Pattern Builder
            const components = config.filename_pattern?.components || {};

            // Update Pattern Builder if available
            if (window.patternBuilder) {
                // Sort by position and extract names
                const sortedComponents = Object.entries(components)
                    .sort((a, b) => a[1] - b[1])
                    .map(([name, pos]) => name);

                if (sortedComponents.length > 0) {
                    window.patternBuilder.patternNames = sortedComponents;
                    window.patternBuilder.delimiter = config.filename_pattern?.delimiter || '_';
                    window.patternBuilder.renderPatternItems();
                    window.patternBuilder.updatePreview();

                    // Update delimiter dropdown
                    const delimiterSelect = document.getElementById('patternDelimiter');
                    if (delimiterSelect) {
                        delimiterSelect.value = window.patternBuilder.delimiter;
                    }
                }
            }

            // Also update the legacy components table
            const componentsBody = document.getElementById('batchComponentsBody');
            if (componentsBody) {
                componentsBody.innerHTML = '';
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
                            group.min_files || 2
                        );
                    });
                } else {
                    // Add default average groups if none defined
                    addBatchAverageGroup('ttl_average', ['router', 'ttl'], 2);
                    addBatchAverageGroup('buffer_average', ['router', 'buffer'], 2);
                }
            }

            // Update the pattern preview after loading
            setTimeout(() => updatePatternPreview(), 100);
        })
        .catch(error => console.error('Failed to load batch config:', error));
}

function saveBatchConfig() {
    postConfig('averager', collectBatchConfig())
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
            const targets = config.features?.targets?.length
                ? config.features.targets
                : parseTagifyLikeValues(config.features?.target);
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
    postConfig('regression', collectRegressionConfig())
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
        averager: batchConfig,
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
    // Show console and clear it
    showConsole();
    clearConsole();

    logStep(`Starting ${step} post-processing...`);

    // IMPORTANT: Save the config BEFORE running the step
    logInfo('Saving configuration...');
    try {
        let configData = null;
        if (step === 'averager') {
            configData = collectAveragerConfig();
        } else if (step === 'analysis') {
            configData = collectAnalysisConfig();
        } else if (step === 'regression') {
            configData = collectRegressionConfig();
        }

        if (configData) {
            const saveResponse = await fetch('/api/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: step, changes: configData })
            });
            if (saveResponse.ok) {
                logSuccess(`${step} config saved.`);
            } else {
                logWarning(`Could not save ${step} config, using existing settings.`);
            }
        }
    } catch (e) {
        logWarning(`Config save error: ${e.message}, continuing with existing settings.`);
    }

    addDivider();
    logInfo(`Endpoint: /api/run-${step}`);

    const endpoints = {
        'averager': '/api/run-averager',
        'analysis': '/api/run-analysis',
        'regression': '/api/run-regression'
    };

    const endpoint = endpoints[step];
    if (!endpoint) {
        logError(`Unknown step: ${step}`);
        return;
    }

    try {
        const startTime = Date.now();
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (data.success) {
            logSuccess(`${step} completed successfully in ${duration}s`);
            if (data.message) {
                logInfo(data.message);
            }
            if (data.output) {
                addDivider();
                logInfo('📋 Script Output:');
                formatBackendOutput(data.output);
            }
            showSaveStatus(`✓ ${step} completed`, true);
        } else {
            logError(`${step} failed after ${duration}s`);
            if (data.message) {
                logError(data.message);
            }
            if (data.output) {
                addDivider();
                logWarning('📋 Error Output:');
                formatBackendOutput(data.output);
            }
            showSaveStatus(`✗ ${step} failed`, false);
        }
    } catch (error) {
        console.error(`Error running ${step}:`, error);
        logError(`Network error: ${error.message}`);
        showSaveStatus(`✗ ${step} error`, false);
    }

    addDivider();
    logInfo('Processing complete.');
}

/**
 * Run all post-processing steps in sequence
 */
async function runAllPostProcessing() {
    // Show console and clear it
    showConsole();
    clearConsole();

    logStep('🚀 Starting Complete Post-Processing Pipeline');
    logInfo('Steps: Averager → Analysis → Regression');
    addDivider();

    const steps = ['averager', 'analysis', 'regression'];
    const stepLabels = {
        'averager': '📊 Step 1/3: Data Averaging',
        'analysis': '📈 Step 2/3: Data Analysis',
        'regression': '🤖 Step 3/3: Regression Models'
    };

    let allSuccess = true;
    const totalStartTime = Date.now();

    for (const step of steps) {
        logStep(stepLabels[step] || `Running ${step}`);

        try {
            const stepStartTime = Date.now();
            const response = await fetch(`/api/run-${step}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            const stepDuration = ((Date.now() - stepStartTime) / 1000).toFixed(2);

            if (data.success) {
                logSuccess(`${step} completed in ${stepDuration}s`);
                if (data.message) {
                    logInfo(data.message);
                }
                if (data.output) {
                    formatBackendOutput(data.output);
                }
            } else {
                logError(`${step} failed after ${stepDuration}s`);
                if (data.message) {
                    logError(data.message);
                }
                if (data.output) {
                    formatBackendOutput(data.output);
                }
                allSuccess = false;
                // Continue to next step even if one fails
            }
        } catch (error) {
            logError(`Network error in ${step}: ${error.message}`);
            allSuccess = false;
        }

        addDivider();
    }

    const totalDuration = ((Date.now() - totalStartTime) / 1000).toFixed(2);

    if (allSuccess) {
        logSuccess(`🎉 All post-processing completed successfully in ${totalDuration}s`);
    } else {
        logWarning(`⚠️ Pipeline completed with errors in ${totalDuration}s`);
    }

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
                group.minFiles
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

