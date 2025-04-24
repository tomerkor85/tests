/**
 * Client Management JavaScript
 * Handles all client-related functionality for the RadixInsight platform
 */

class ClientManager {
    constructor() {
        this.clients = [];
        this.initEventListeners();
    }

    /**
     * Initialize all event listeners for client management
     */
    initEventListeners() {
        // New Client button
        const newClientBtn = document.getElementById('new-client-btn');
        if (newClientBtn) {
            newClientBtn.addEventListener('click', () => this.showNewClientModal());
        }
        
        // Create Client button
        const createClientBtn = document.getElementById('create-client-btn');
        if (createClientBtn) {
            createClientBtn.addEventListener('click', () => this.createClient());
        }
        
        // Save Client button
        const saveClientBtn = document.getElementById('save-client-btn');
        if (saveClientBtn) {
            saveClientBtn.addEventListener('click', () => this.saveClientChanges());
        }
        
        // Copy SDK Code button
        const copySdkCodeBtn = document.getElementById('copy-sdk-code');
        if (copySdkCodeBtn) {
            copySdkCodeBtn.addEventListener('click', () => this.copySdkCode());
        }
        
        // Show/Hide API Key button
        const showApiKeyBtn = document.getElementById('show-api-key');
        if (showApiKeyBtn) {
            showApiKeyBtn.addEventListener('click', () => this.toggleApiKeyVisibility());
        }
        
        // Regenerate API Key button
        const regenerateApiKeyBtn = document.getElementById('regenerate-api-key');
        if (regenerateApiKeyBtn) {
            regenerateApiKeyBtn.addEventListener('click', () => this.regenerateApiKey());
        }
        
        // Client search
        const clientSearch = document.getElementById('client-search');
        if (clientSearch) {
            clientSearch.addEventListener('input', (e) => this.searchClients(e.target.value));
        }
        
        // Modal close buttons
        document.querySelectorAll('[data-dismiss="modal"]').forEach(button => {
            button.addEventListener('click', (e) => this.closeModal(e));
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
        
        // Setup existing client buttons
        this.setupClientButtons();
    }

    /**
     * Show the new client modal
     */
    showNewClientModal() {
        const newClientModal = document.getElementById('newClientModal');
        if (newClientModal) {
            newClientModal.style.display = 'block';
        }
    }

    /**
     * Create a new client
     */
    createClient() {
        const clientName = document.getElementById('client-name').value;
        const clientId = document.getElementById('client-id').value;
        const clientUrl = document.getElementById('client-url').value;
        const clientEmail = document.getElementById('client-admin-email')?.value;
        
        // Validate form
        if (!clientName || !clientId || !clientUrl) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Create client object
        const newClient = {
            name: clientName,
            id: clientId,
            url: clientUrl,
            email: clientEmail,
            status: 'active',
            apiKey: 'sk_' + Math.random().toString(36).substring(2, 15)
        };
        
        // Add to clients array
        this.clients.push(newClient);
        
        // Add new row to table
        this.addClientToTable(newClient);
        
        // Close modal and reset form
        document.getElementById('newClientModal').style.display = 'none';
        document.getElementById('new-client-form').reset();
        
        this.showNotification('Client created successfully', 'success');
    }

    /**
     * Add a client to the table
     * @param {Object} client - The client object
     */
    addClientToTable(client) {
        const clientsTable = document.getElementById('clients-table')?.getElementsByTagName('tbody')[0];
        if (!clientsTable) return;
        
        const newRow = clientsTable.insertRow();
        newRow.innerHTML = `
            <td>${client.name}</td>
            <td>${client.id}</td>
            <td>${client.url}</td>
            <td><span class="badge badge-${client.status === 'active' ? 'success' : client.status === 'pending' ? 'warning' : 'danger'}">${client.status.charAt(0).toUpperCase() + client.status.slice(1)}</span></td>
            <td>
                <button class="btn btn-sm btn-outline view-client-btn" data-id="${client.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline edit-client-btn" data-id="${client.id}">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        
        // Update view and edit buttons
        this.setupClientButtons();
    }

    /**
     * Setup client view and edit buttons
     */
    setupClientButtons() {
        document.querySelectorAll('.view-client-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const clientId = e.currentTarget.getAttribute('data-id');
                this.viewClient(clientId);
            });
        });
        
        document.querySelectorAll('.edit-client-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const clientId = e.currentTarget.getAttribute('data-id');
                this.editClient(clientId);
            });
        });
    }

    /**
     * View client details
     * @param {string} clientId - The client ID
     */
    viewClient(clientId) {
        // Find client in array or fetch from API
        let client = this.clients.find(c => c.id === clientId);
        
        // If not in array, use demo data
        if (!client) {
            if (clientId === 'demo-client-123') {
                client = {
                    name: 'Demo Client',
                    id: 'demo-client-123',
                    url: 'https://demo-client.example.com',
                    status: 'Active',
                    apiKey: 'sk_demo_123456789abcdef'
                };
            } else {
                client = {
                    name: 'Test Client',
                    id: 'test-client-456',
                    url: 'https://test-client.example.com',
                    status: 'Pending',
                    apiKey: 'sk_test_987654321fedcba'
                };
            }
        }
        
        // Populate modal with client data
        document.getElementById('view-client-name').textContent = client.name;
        document.getElementById('view-client-id').textContent = client.id;
        document.getElementById('view-client-url').textContent = client.url;
        document.getElementById('view-client-status').textContent = client.status;
        document.getElementById('view-client-api-key').textContent = '••••••••••••••••';
        document.getElementById('show-api-key').innerHTML = '<i class="fas fa-eye"></i>';
        
        // Update SDK code
        const sdkCode = document.getElementById('sdk-code');
        sdkCode.textContent = `// Add this script to your website
<script src="https://cdn.radixinsight.com/sdk.js?client=${client.id}"><\/script>

// Initialize the SDK
<script>
  document.addEventListener('DOMContentLoaded', function() {
    RadixInsight.init({
      clientId: '${client.id}'
    });
  });
<\/script>`;
        
        // Store client data for API key operations
        sdkCode.dataset.clientApiKey = client.apiKey;
        
        // Show modal
        document.getElementById('viewClientModal').style.display = 'block';
    }

    /**
     * Edit client
     * @param {string} clientId - The client ID
     */
    editClient(clientId) {
        // Find client in array or fetch from API
        let client = this.clients.find(c => c.id === clientId);
        
        // If not in array, use demo data
        if (!client) {
            if (clientId === 'demo-client-123') {
                client = {
                    name: 'Demo Client',
                    id: 'demo-client-123',
                    url: 'https://demo-client.example.com',
                    status: 'active'
                };
            } else {
                client = {
                    name: 'Test Client',
                    id: 'test-client-456',
                    url: 'https://test-client.example.com',
                    status: 'pending'
                };
            }
        }
        
        // Populate form with client data
        document.getElementById('edit-client-id-hidden').value = client.id;
        document.getElementById('edit-client-name').value = client.name;
        document.getElementById('edit-client-id').value = client.id;
        document.getElementById('edit-client-url').value = client.url;
        document.getElementById('edit-client-status').value = client.status;
        
        // Show modal
        document.getElementById('editClientModal').style.display = 'block';
    }

    /**
     * Save client changes
     */
    saveClientChanges() {
        const clientId = document.getElementById('edit-client-id-hidden').value;
        const clientName = document.getElementById('edit-client-name').value;
        const clientUrl = document.getElementById('edit-client-url').value;
        const clientStatus = document.getElementById('edit-client-status').value;
        
        // Validate form
        if (!clientName || !clientUrl) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Find client in array
        const clientIndex = this.clients.findIndex(c => c.id === clientId);
        
        // Update client if found
        if (clientIndex !== -1) {
            this.clients[clientIndex].name = clientName;
            this.clients[clientIndex].url = clientUrl;
            this.clients[clientIndex].status = clientStatus;
        }
        
        // Update table row
        const clientsTable = document.getElementById('clients-table');
        const rows = clientsTable.getElementsByTagName('tr');
        for (let i = 1; i < rows.length; i++) {
            const idCell = rows[i].getElementsByTagName('td')[1];
            if (idCell.textContent === clientId) {
                rows[i].getElementsByTagName('td')[0].textContent = clientName;
                rows[i].getElementsByTagName('td')[2].textContent = clientUrl;
                const statusCell = rows[i].getElementsByTagName('td')[3];
                const statusBadge = statusCell.getElementsByTagName('span')[0];
                statusBadge.textContent = clientStatus.charAt(0).toUpperCase() + clientStatus.slice(1);
                statusBadge.className = `badge badge-${clientStatus === 'active' ? 'success' : clientStatus === 'pending' ? 'warning' : 'danger'}`;
                break;
            }
        }
        
        // Close modal
        document.getElementById('editClientModal').style.display = 'none';
        
        this.showNotification('Client updated successfully', 'success');
    }

    /**
     * Copy SDK code to clipboard
     */
    copySdkCode() {
        const sdkCode = document.getElementById('sdk-code').textContent;
        navigator.clipboard.writeText(sdkCode).then(() => {
            this.showNotification('SDK code copied to clipboard', 'success');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            this.showNotification('Failed to copy SDK code', 'error');
        });
    }

    /**
     * Toggle API key visibility
     */
    toggleApiKeyVisibility() {
        const apiKeyElement = document.getElementById('view-client-api-key');
        const showApiKeyBtn = document.getElementById('show-api-key');
        const clientId = document.getElementById('view-client-id').textContent;
        const sdkCode = document.getElementById('sdk-code');
        
        if (apiKeyElement.textContent.includes('•')) {
            // Show API key
            let apiKey;
            
            // Try to get from clients array
            const client = this.clients.find(c => c.id === clientId);
            if (client) {
                apiKey = client.apiKey;
            } else {
                // Use stored API key or fallback to demo keys
                apiKey = sdkCode.dataset.clientApiKey || 
                         (clientId === 'demo-client-123' ? 'sk_demo_123456789abcdef' : 'sk_test_987654321fedcba');
            }
            
            apiKeyElement.textContent = apiKey;
            showApiKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            // Hide API key
            apiKeyElement.textContent = '••••••••••••••••';
            showApiKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }

    /**
     * Regenerate API key
     */
    regenerateApiKey() {
        if (confirm('Are you sure you want to regenerate the API key? This will invalidate the current key.')) {
            const clientId = document.getElementById('view-client-id').textContent;
            const newApiKey = 'sk_' + Math.random().toString(36).substring(2, 15);
            
            // Update client in array
            const clientIndex = this.clients.findIndex(c => c.id === clientId);
            if (clientIndex !== -1) {
                this.clients[clientIndex].apiKey = newApiKey;
            }
            
            // Update stored API key
            const sdkCode = document.getElementById('sdk-code');
            sdkCode.dataset.clientApiKey = newApiKey;
            
            // Update displayed API key
            document.getElementById('view-client-api-key').textContent = newApiKey;
            document.getElementById('show-api-key').innerHTML = '<i class="fas fa-eye-slash"></i>';
            
            this.showNotification('API key has been regenerated', 'success');
        }
    }

    /**
     * Search clients
     * @param {string} searchTerm - The search term
     */
    searchClients(searchTerm) {
        searchTerm = searchTerm.toLowerCase();
        const clientsTable = document.getElementById('clients-table');
        const rows = clientsTable.getElementsByTagName('tr');
        
        for (let i = 1; i < rows.length; i++) {
            const nameCell = rows[i].getElementsByTagName('td')[0];
            const idCell = rows[i].getElementsByTagName('td')[1];
            const urlCell = rows[i].getElementsByTagName('td')[2];
            
            const nameMatch = nameCell.textContent.toLowerCase().includes(searchTerm);
            const idMatch = idCell.textContent.toLowerCase().includes(searchTerm);
            const urlMatch = urlCell.textContent.toLowerCase().includes(searchTerm);
            
            if (nameMatch || idMatch || urlMatch) {
                rows[i].style.display = '';
            } else {
                rows[i].style.display = 'none';
            }
        }
    }

    /**
     * Close modal
     * @param {Event} e - The event object
     */
    closeModal(e) {
        const modal = e.target.closest('.modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Show notification
     * @param {string} message - The notification message
     * @param {string} type - The notification type (success, error)
     */
    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `toast toast-${type} animate-slide-up`;
        notification.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('animate-fade-out');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize client manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.clientManager = new ClientManager();
});
