/**
 * Console Log Utility for OppNDA GUI
 * Provides terminal-like colored logging with real-time streaming support
 */

// ============================================================
// CONSOLE LOGGING UTILITIES
// ============================================================

/**
 * Get formatted timestamp
 */
function getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get color class based on log level
 */
function getLogColor(level) {
    const colors = {
        'info': '#e2e8f0',      // Bright slate - readable on dark bg
        'success': '#4ade80',   // Vivid green
        'warning': '#facc15',   // Vivid yellow
        'error': '#fb7185',     // Vivid rose
        'step': '#c084fc',      // Vivid purple
        'output': '#94a3b8'     // Readable gray (was nearly invisible)
    };
    return colors[level] || colors.info;
}

/**
 * Create a simple terminal-like log line
 */
function createLogLine(level, message) {
    const timestamp = getTimestamp();
    const color = getLogColor(level);
    const escapedMessage = escapeHtml(message);

    return `<div style="font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.6; color: ${color}; padding: 2px 0;">
        <span style="color: #64748b; margin-right: 8px;">[${timestamp}]</span>${escapedMessage}
    </div>`;
}

/**
 * Append a log entry to the console
 */
function appendLog(level, message) {
    const logDiv = document.getElementById('postProcessingLog');
    if (logDiv) {
        logDiv.innerHTML += createLogLine(level, message);
        logDiv.scrollTop = logDiv.scrollHeight;
    }
}

/**
 * Log functions
 */
function logInfo(message) { appendLog('info', message); }
function logSuccess(message) { appendLog('success', `✓ ${message}`); }
function logWarning(message) { appendLog('warning', `⚠ ${message}`); }
function logError(message) { appendLog('error', `✗ ${message}`); }
function logStep(message) { appendLog('step', `→ ${message}`); }
function logOutput(message) { appendLog('output', `  ${message}`); }

/**
 * Add a divider in the console
 */
function addDivider() {
    const logDiv = document.getElementById('postProcessingLog');
    if (logDiv) {
        logDiv.innerHTML += '<div style="border-top: 1px dashed #334155; margin: 8px 0;"></div>';
    }
}

/**
 * Clear the console
 */
function clearConsole() {
    const logDiv = document.getElementById('postProcessingLog');
    if (logDiv) {
        logDiv.innerHTML = '';
    }
}

/**
 * Copy console content to clipboard
 */
function copyConsole() {
    const logDiv = document.getElementById('postProcessingLog');
    if (logDiv) {
        const textContent = logDiv.innerText || logDiv.textContent;
        navigator.clipboard.writeText(textContent).then(() => {
            showSaveStatus('✓ Console copied to clipboard', true);
        }).catch(() => {
            showSaveStatus('✗ Failed to copy', false);
        });
    }
}

/**
 * Show the console output area
 */
function showConsole() {
    const outputDiv = document.getElementById('postProcessingOutput');
    if (outputDiv) {
        outputDiv.style.display = 'block';
    }
}

// Track the active EventSource for stop functionality
let _activeEventSource = null;
let _activeStep = null;

/**
 * Stop the currently running process
 */
function stopProcess() {
    // Close the EventSource to stop receiving updates
    if (_activeEventSource) {
        _activeEventSource.close();
        _activeEventSource = null;
    }

    // Terminate the backend process
    const target = _activeStep || 'post_processing';
    logWarning(`Terminating ${target}...`);

    fetch('/api/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'post_processing' })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                logWarning(`⛔ ${data.message}`);
                showSaveStatus('Process stopped', false);
            } else {
                logError(`Stop failed: ${data.message}`);
            }
            _activeStep = null;
            updateConsoleButtons(false);
        })
        .catch(error => {
            logError(`Stop error: ${error.message}`);
            _activeStep = null;
            updateConsoleButtons(false);
        });
}

/**
 * Update the visibility of stop button in console header
 */
function updateConsoleButtons(isRunning) {
    const stopBtn = document.getElementById('consoleStopBtn');
    if (stopBtn) {
        stopBtn.style.display = isRunning ? 'inline-flex' : 'none';
    }
}

/**
 * Run a post-processing step with real-time streaming
 */
function runStreamingStep(step) {
    // Show console and clear it
    showConsole();
    clearConsole();

    logStep(`Starting ${step}...`);
    addDivider();

    const endpoints = {
        'averager': '/api/stream-averager',
        'analysis': '/api/stream-analysis',
        'regression': '/api/stream-regression'
    };

    const endpoint = endpoints[step];
    if (!endpoint) {
        logError(`Unknown step: ${step}`);
        return;
    }

    const startTime = Date.now();
    _activeStep = step;
    updateConsoleButtons(true);

    // Create EventSource for SSE streaming
    const eventSource = new EventSource(endpoint);
    _activeEventSource = eventSource;

    eventSource.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'start':
                    logInfo(data.message);
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
                    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                    if (data.success) {
                        logSuccess(`Completed in ${duration}s`);
                        showSaveStatus(`✓ ${step} completed`, true);
                    } else {
                        logError(`Failed after ${duration}s - ${data.message}`);
                        showSaveStatus(`✗ ${step} failed`, false);
                    }
                    break;

                case 'error':
                    logError(data.message);
                    break;

                case 'end':
                    eventSource.close();
                    break;
            }
        } catch (e) {
            // If not JSON, just log as output
            logOutput(event.data);
        }
    };

    eventSource.onerror = function (error) {
        eventSource.close();
        _activeEventSource = null;
        _activeStep = null;
        updateConsoleButtons(false);
        logError('Connection error or stream ended');
        showSaveStatus(`✗ ${step} error`, false);
    };
}

/**
 * Run all post-processing steps with streaming
 */
async function runAllStreamingSteps() {
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
        logStep(stepLabels[step]);

        const success = await runStreamingStepAsync(step);
        if (!success) {
            allSuccess = false;
        }

        addDivider();
    }

    const totalDuration = ((Date.now() - totalStartTime) / 1000).toFixed(2);

    if (allSuccess) {
        logSuccess(`🎉 All post-processing completed in ${totalDuration}s`);
    } else {
        logWarning(`Pipeline completed with errors in ${totalDuration}s`);
    }

    showSaveStatus(allSuccess ? '✓ Post-processing complete' : '⚠ Post-processing had errors', allSuccess);
}

/**
 * Run a single streaming step and return a promise
 */
function runStreamingStepAsync(step) {
    return new Promise((resolve) => {
        const endpoints = {
            'averager': '/api/stream-averager',
            'analysis': '/api/stream-analysis',
            'regression': '/api/stream-regression'
        };

        const endpoint = endpoints[step];
        if (!endpoint) {
            logError(`Unknown step: ${step}`);
            resolve(false);
            return;
        }

        const eventSource = new EventSource(endpoint);
        _activeEventSource = eventSource;
        _activeStep = step;
        updateConsoleButtons(true);
        let success = true;

        eventSource.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'log':
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
                        success = data.success;
                        if (data.success) {
                            logSuccess(data.message);
                        } else {
                            logError(data.message);
                        }
                        break;

                    case 'error':
                        logError(data.message);
                        success = false;
                        break;

                    case 'end':
                        eventSource.close();
                        resolve(success);
                        break;
                }
            } catch (e) {
                logOutput(event.data);
            }
        };

        eventSource.onerror = function () {
            eventSource.close();
            _activeEventSource = null;
            _activeStep = null;
            updateConsoleButtons(false);
            resolve(false);
        };
    });
}

/**
 * Format and display backend output (multi-line string or array)
 * Parses output lines and logs them with appropriate styling
 */
function formatBackendOutput(output) {
    if (!output) return;

    // Handle array or string
    const lines = Array.isArray(output) ? output : output.split('\n');

    lines.forEach(line => {
        if (!line || !line.trim()) return;

        const trimmed = line.trim();

        // Detect error lines
        if (trimmed.toLowerCase().includes('error') ||
            trimmed.toLowerCase().includes('failed') ||
            trimmed.startsWith('✗')) {
            logError(trimmed);
        }
        // Detect warning lines
        else if (trimmed.toLowerCase().includes('warning') ||
            trimmed.startsWith('⚠')) {
            logWarning(trimmed);
        }
        // Detect success lines
        else if (trimmed.toLowerCase().includes('success') ||
            trimmed.toLowerCase().includes('completed') ||
            trimmed.startsWith('✓')) {
            logSuccess(trimmed);
        }
        // Step/progress lines
        else if (trimmed.startsWith('→') || trimmed.startsWith('>>')) {
            logStep(trimmed);
        }
        // Regular output
        else {
            logOutput(trimmed);
        }
    });
}

// Make functions globally available
window.clearConsole = clearConsole;
window.copyConsole = copyConsole;
window.logInfo = logInfo;
window.logSuccess = logSuccess;
window.logWarning = logWarning;
window.logError = logError;
window.logStep = logStep;
window.logOutput = logOutput;
window.addDivider = addDivider;
window.showConsole = showConsole;
window.runStreamingStep = runStreamingStep;
window.runAllStreamingSteps = runAllStreamingSteps;
window.formatBackendOutput = formatBackendOutput;
window.stopProcess = stopProcess;
