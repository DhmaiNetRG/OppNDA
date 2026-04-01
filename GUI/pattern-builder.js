/**
 * Simple File Pattern Builder
 * Users can add custom names and arrange them in order
 * Supports drag-reordering of pattern items
 */

class PatternBuilder {
    constructor() {
        this.patternNames = ['scenario', 'router', 'seed', 'ttl', 'buffer', 'reports'];  // Default starting pattern
        this.delimiter = '_';
        this.draggedIndex = null;
        this.init();
    }

    init() {
        this.renderUI();
        this.renderPatternItems();
        this.attachEventListeners();
        this.updatePreview();
    }

    renderUI() {
        const container = document.getElementById('patternBuilderContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="pattern-builder-simple">
                <!-- Input Section -->
                <div class="pattern-section">
                    <h4 style="margin: 0 0 10px 0; color: #1f2937;">Add Pattern Name</h4>
                    <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <input 
                            type="text" 
                            id="patternNameInput" 
                            placeholder="e.g., scenario, router, seed, TTL, etc."
                            class="pattern-input"
                            style="flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;"
                        />
                        <button id="patternAddBtn" class="pattern-add-btn" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                            + Add
                        </button>
                    </div>
                </div>

                <!-- Current Pattern Section -->
                <div class="pattern-section">
                    <h4 style="margin: 0 0 10px 0; color: #1f2937;">Your Pattern <span style="font-size: 12px; color: #6b7280; font-weight: normal;">(drag to reorder)</span></h4>
                    <div id="patternItemsList" class="pattern-items-list" style="min-height: 100px; border: 2px dashed #cbd5e1; border-radius: 6px; padding: 12px; background: #f9fafb;">
                        <!-- Items will be rendered here -->
                    </div>
                </div>

                <!-- Settings Section -->
                <div class="pattern-section">
                    <h4 style="margin: 0 0 10px 0; color: #1f2937;">Separator</h4>
                    <select id="patternDelimiter" class="pattern-delimiter-select" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                        <option value="_">Underscore (_)</option>
                        <option value="-">Hyphen (-)</option>
                        <option value=".">Dot (.)</option>
                    </select>
                </div>

                <!-- Preview Section -->
                <div class="pattern-section">
                    <h4 style="margin: 0 0 10px 0; color: #1f2937;">Pattern Preview</h4>
                    <div id="patternPreview" class="pattern-preview-box" style="padding: 12px; background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 4px; font-family: 'Courier New', monospace; color: #1f2937; min-height: 40px;">
                        <!-- Preview will be shown here -->
                    </div>
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 8px; margin-top: 15px;">
                    <button id="patternResetBtn" class="pattern-action-btn" style="flex: 1; padding: 8px 12px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-weight: 500;">Reset</button>
                    <button id="patternClearBtn" class="pattern-action-btn" style="flex: 1; padding: 8px 12px; background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; border-radius: 4px; cursor: pointer; font-weight: 500;">Clear All</button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Add button
        const addBtn = document.getElementById('patternAddBtn');
        const nameInput = document.getElementById('patternNameInput');

        if (addBtn && nameInput) {
            addBtn.addEventListener('click', () => this.addPattern());
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addPattern();
                }
            });
        }

        // Delimiter change
        const delimiterSelect = document.getElementById('patternDelimiter');
        if (delimiterSelect) {
            delimiterSelect.addEventListener('change', (e) => {
                this.delimiter = e.target.value;
                this.updatePreview();
                this.savePattern();
            });
        }

        // Reset and Clear buttons
        const resetBtn = document.getElementById('patternResetBtn');
        const clearBtn = document.getElementById('patternClearBtn');

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefault());
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear all pattern items?')) {
                    this.clearAll();
                }
            });
        }
    }

    addPattern() {
        const input = document.getElementById('patternNameInput');
        if (!input) return;

        let name = input.value.trim();

        if (!name) {
            alert('Please enter a pattern name');
            input.focus();
            return;
        }

        // Sanitize the name
        name = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        if (!name) {
            alert('Pattern name contains invalid characters');
            return;
        }

        if (this.patternNames.includes(name)) {
            alert(`"${name}" is already in your pattern`);
            input.focus();
            return;
        }

        this.patternNames.push(name);
        input.value = '';
        input.focus();

        this.renderPatternItems();
        this.updatePreview();
        this.savePattern();
    }

    renderPatternItems() {
        const listContainer = document.getElementById('patternItemsList');
        if (!listContainer) return;

        if (this.patternNames.length === 0) {
            listContainer.innerHTML = '<div style="color: #9ca3af; padding: 20px; text-align: center;">No items yet. Add a pattern name above.</div>';
            return;
        }

        let html = '';
        this.patternNames.forEach((name, index) => {
            const color = this.getColorForIndex(index);
            html += `
                <div 
                    class="pattern-item-draggable" 
                    draggable="true" 
                    data-index="${index}"
                    style="
                        background: white;
                        border: 2px solid ${color}40;
                        border-left: 4px solid ${color};
                        padding: 10px 12px;
                        border-radius: 4px;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        cursor: move;
                        user-select: none;
                        transition: all 0.2s ease;
                    "
                >
                    <span style="color: #6b7280; font-weight: bold;">⋮⋮</span>
                    <span style="flex: 1; font-weight: 500; color: #1f2937;">${this.escapeHtml(name)}</span>
                    <span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600;">#${index + 1}</span>
                    <button 
                        class="pattern-item-remove-btn" 
                        data-index="${index}"
                        style="
                            background: #fee2e2;
                            color: #991b1b;
                            border: none;
                            padding: 4px 8px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-weight: bold;
                            font-size: 14px;
                        "
                        title="Remove this item"
                    >
                        ✕
                    </button>
                </div>
            `;
        });

        listContainer.innerHTML = html;

        // Attach drag events
        const items = listContainer.querySelectorAll('.pattern-item-draggable');
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleDragStart(e));
            item.addEventListener('dragover', (e) => this.handleDragOver(e));
            item.addEventListener('drop', (e) => this.handleDrop(e));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
            item.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            item.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });

        // Attach remove button events
        const removeButtons = listContainer.querySelectorAll('.pattern-item-remove-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removePattern(index);
            });
        });
    }

    handleDragStart(e) {
        const index = parseInt(e.currentTarget.dataset.index);
        this.draggedIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';
        e.currentTarget.style.backgroundColor = '#f0fdf4';
    }

    handleDragEnter(e) {
        if (this.draggedIndex !== null) {
            e.currentTarget.style.borderTop = '3px solid #3b82f6';
            e.currentTarget.style.paddingTop = '7px';
        }
    }

    handleDragLeave(e) {
        e.currentTarget.style.borderTop = '2px solid transparent';
        e.currentTarget.style.paddingTop = '10px';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        if (this.draggedIndex === null) return;

        const targetIndex = parseInt(e.currentTarget.dataset.index);

        if (this.draggedIndex !== targetIndex) {
            // Reorder the array
            const [movedItem] = this.patternNames.splice(this.draggedIndex, 1);
            const insertIndex = this.draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
            this.patternNames.splice(insertIndex, 0, movedItem);

            this.draggedIndex = null;
            this.renderPatternItems();
            this.updatePreview();
            this.savePattern();
        }
    }

    handleDragEnd(e) {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.borderTop = '2px solid transparent';
        e.currentTarget.style.paddingTop = '10px';
        this.draggedIndex = null;
    }

    removePattern(index) {
        this.patternNames.splice(index, 1);
        this.renderPatternItems();
        this.updatePreview();
        this.savePattern();
    }

    resetToDefault() {
        this.patternNames = ['scenario', 'router', 'seed', 'ttl', 'buffer', 'reports'];
        this.delimiter = '_';
        document.getElementById('patternDelimiter').value = '_';
        this.renderPatternItems();
        this.updatePreview();
        this.savePattern();
    }

    clearAll() {
        this.patternNames = [];
        this.renderPatternItems();
        this.updatePreview();
        this.savePattern();
    }

    updatePreview() {
        const preview = document.getElementById('patternPreview');
        if (!preview) return;

        if (this.patternNames.length === 0) {
            preview.innerHTML = '<span style="color: #6b7280;">No pattern defined</span>';
            return;
        }

        const parts = this.patternNames.map((name, index) => {
            const color = this.getColorForIndex(index);
            return `<span style="background: ${color}; color: white; padding: 3px 6px; border-radius: 3px; margin: 0 2px; font-weight: bold;">${this.escapeHtml(name)}</span>`;
        }).join(`<span style="margin: 0 4px; color: #6b7280; font-weight: bold;">${this.delimiter}</span>`);

        preview.innerHTML = `<div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0;">${parts}<span style="margin-left: 8px; color: #9ca3af;">.txt</span></div>`;
    }

    savePattern() {
        // Auto-save the pattern to AVERAGER config (not scenario)
        // Build the components object with name:position mapping
        const components = {};
        this.patternNames.forEach((name, index) => {
            components[name] = index;
        });

        // Save to averager config via API
        const patternData = {
            filename_pattern: {
                delimiter: this.delimiter,
                components: components
            }
        };

        // Use fetch to save directly to averager config
        fetch('/api/config/averager', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patternData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error saving pattern:', data.error);
                }
            })
            .catch(error => {
                console.warn('Pattern auto-save failed:', error.message);
            });

        // Also store in session for later reference
        sessionStorage.setItem('filePattern', JSON.stringify({
            names: this.patternNames,
            delimiter: this.delimiter,
            pattern: this.getPatternString()
        }));

        // Update Group By dropdowns with new pattern names
        this.updateGroupByDropdowns();
    }

    updateGroupByDropdowns() {
        // Find all Group By input elements in the Average Groups table
        const groupByInputs = document.querySelectorAll('input[data-field="groupBy"]');

        groupByInputs.forEach(input => {
            // Update Tagify whitelist when pattern changes
            if (input.tagify) {
                input.tagify.settings.whitelist = this.patternNames;
                input.tagify.dropdown.show();
            }
        });
    }

    getPatternString() {
        return this.patternNames.join(this.delimiter);
    }

    getColorForIndex(index) {
        const colors = [
            '#3b82f6',  // blue
            '#10b981',  // green
            '#f59e0b',  // amber
            '#ef4444',  // red
            '#8b5cf6',  // violet
            '#ec4899',  // pink
            '#14b8a6',  // teal
            '#6366f1',  // indigo
        ];
        return colors[index % colors.length];
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Public methods for accessing pattern data
    getPattern() {
        return [...this.patternNames];  // Return a copy
    }

    getPatternData() {
        return {
            names: [...this.patternNames],
            delimiter: this.delimiter,
            pattern: this.getPatternString()
        };
    }

    /**
     * Build a ONE simulator Scenario.name template from the pattern components.
     * Maps human-readable pattern names to ONE simulator %%placeholder%% syntax.
     * 'scenario' is the base name (handled separately as the prefix).
     * 'reports' is auto-appended by ONE and excluded from the template.
     * Any unknown names are included as literal text.
     * 
     * @param {string} scenarioName - The base scenario name to use as prefix
     * @returns {string} The Scenario.name template string for ONE settings
     */
    getScenarioNameTemplate(scenarioName) {
        // Use config-loaded placeholders if available, otherwise fall back to defaults
        const ONE_PLACEHOLDERS = this._onePlaceholders || {
            'router': '%%Group.router%%',
            'seed': '%%MovementModel.rngSeed%%',
            'ttl': '%%Group.msgTtl%%',
            'buffer': '%%Group.bufferSize%%',
        };

        const parts = [];
        for (const name of this.patternNames) {
            if (name === 'scenario' || name === 'scenario_name') {
                // 'scenario' maps to the literal scenario name prefix
                parts.push(scenarioName);
            } else if (name === 'reports' || name === 'report_type') {
                // 'reports' is auto-appended by ONE — skip it in the template
                continue;
            } else if (ONE_PLACEHOLDERS[name]) {
                parts.push(ONE_PLACEHOLDERS[name]);
            } else {
                // Unknown component — include as literal text
                parts.push(name);
            }
        }

        return parts.join(this.delimiter);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('patternBuilderContainer')) {
        window.patternBuilder = new PatternBuilder();
    }
});
