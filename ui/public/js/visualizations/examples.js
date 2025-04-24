/**
 * Example usage of visualization components
 * 
 * This file demonstrates how to use the visualization components.
 */

// Import visualization components
const { PieChart, DataTable, FlowDiagram } = require('./index');

// Example data for pie chart
const pieChartData = [
  { label: 'Chrome', value: 61.41 },
  { label: 'Safari', value: 15.73 },
  { label: 'Firefox', value: 4.86 },
  { label: 'Edge', value: 3.24 },
  { label: 'Opera', value: 1.40 },
  { label: 'Other', value: 13.36 }
];

// Example data for data table
const tableData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', visits: 45, conversion: 0.23 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', visits: 27, conversion: 0.19 },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', visits: 65, conversion: 0.41 },
  { id: 4, name: 'Alice Williams', email: 'alice@example.com', visits: 33, conversion: 0.15 },
  { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', visits: 18, conversion: 0.28 }
];

// Example data for flow diagram
const flowData = {
  nodes: [
    { id: 'homepage', label: 'Homepage', level: 0 },
    { id: 'products', label: 'Products', level: 1 },
    { id: 'product_detail', label: 'Product Detail', level: 2 },
    { id: 'cart', label: 'Cart', level: 3 },
    { id: 'checkout', label: 'Checkout', level: 4 },
    { id: 'payment', label: 'Payment', level: 5 },
    { id: 'confirmation', label: 'Confirmation', level: 6 },
    { id: 'about', label: 'About', level: 1 },
    { id: 'contact', label: 'Contact', level: 1 }
  ],
  links: [
    { source: 'homepage', target: 'products', value: 100 },
    { source: 'homepage', target: 'about', value: 30 },
    { source: 'homepage', target: 'contact', value: 20 },
    { source: 'products', target: 'product_detail', value: 80 },
    { source: 'product_detail', target: 'cart', value: 40 },
    { source: 'cart', target: 'checkout', value: 30 },
    { source: 'checkout', target: 'payment', value: 25 },
    { source: 'payment', target: 'confirmation', value: 20 },
    { source: 'product_detail', target: 'homepage', value: 20 }
  ]
};

// Create and render visualizations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Create pie chart
  const pieChart = new PieChart('#pie-chart-container', {
    title: 'Browser Market Share',
    subtitle: 'Worldwide, 2023',
    width: 500,
    height: 400,
    innerRadius: 80, // Make it a donut chart
    showLabels: true,
    showValues: true,
    showLegend: true
  });
  
  // Update pie chart with data
  pieChart.update(pieChartData);
  
  // Create data table
  const dataTable = new DataTable('#data-table-container', {
    title: 'User Activity',
    subtitle: 'Last 30 days',
    columns: [
      { id: 'id', label: 'ID' },
      { id: 'name', label: 'Name' },
      { id: 'email', label: 'Email' },
      { 
        id: 'visits', 
        label: 'Visits', 
        align: 'right',
        accessor: d => d.visits,
        format: value => value.toLocaleString()
      },
      { 
        id: 'conversion', 
        label: 'Conversion Rate', 
        align: 'right',
        accessor: d => d.conversion,
        format: value => (value * 100).toFixed(1) + '%'
      }
    ],
    sortable: true,
    paginate: true,
    pageSize: 10,
    showSearch: true
  });
  
  // Update data table with data
  dataTable.update(tableData);
  
  // Create flow diagram
  const flowDiagram = new FlowDiagram('#flow-diagram-container', {
    title: 'User Flow',
    subtitle: 'Checkout Process',
    width: 800,
    height: 500,
    direction: 'horizontal',
    nodeRadius: 25,
    showValues: true,
    valueFormat: d3.format(',d')
  });
  
  // Update flow diagram with data
  flowDiagram.update(flowData);
  
  // Add export buttons
  document.getElementById('export-pie-svg').addEventListener('click', () => {
    const svgString = pieChart.exportSVG();
    downloadFile(svgString, 'pie-chart.svg', 'image/svg+xml');
  });
  
  document.getElementById('export-pie-png').addEventListener('click', () => {
    pieChart.exportPNG().then(blob => {
      downloadFile(blob, 'pie-chart.png', 'image/png');
    });
  });
  
  document.getElementById('export-table-csv').addEventListener('click', () => {
    const csvString = dataTable.exportCSV();
    downloadFile(csvString, 'user-activity.csv', 'text/csv');
  });
  
  document.getElementById('export-flow-svg').addEventListener('click', () => {
    const svgString = flowDiagram.exportSVG();
    downloadFile(svgString, 'user-flow.svg', 'image/svg+xml');
  });
  
  document.getElementById('export-flow-png').addEventListener('click', () => {
    flowDiagram.exportPNG().then(blob => {
      downloadFile(blob, 'user-flow.png', 'image/png');
    });
  });
});

/**
 * Download a file
 * @param {string|Blob} content - File content
 * @param {string} filename - File name
 * @param {string} contentType - Content type
 */
function downloadFile(content, filename, contentType) {
  const blob = content instanceof Blob 
    ? content 
    : new Blob([content], { type: contentType });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = filename;
  a.click();
  
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}
