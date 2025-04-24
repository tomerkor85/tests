/**
 * RadixInsight Analytics Platform
 * Visualization Components
 * 
 * This module provides D3.js-based visualization components for the RadixInsight platform.
 */

// Create a namespace for RadixVisualizations
window.RadixVisualizations = (function() {
  // Private variables and functions
  const defaultColors = [
    '#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FF6D01', 
    '#46BDC6', '#7B61FF', '#1A73E8', '#F25022', '#7FBA00'
  ];

  /**
   * Creates a pie chart visualization
   * @param {string} selector - CSS selector for the container element
   * @param {Object} options - Configuration options
   * @param {Array} options.data - Data array with label and value properties
   * @param {string} [options.title] - Chart title
   * @param {number} [options.width=400] - Chart width
   * @param {number} [options.height=400] - Chart height
   * @param {number} [options.margin=40] - Chart margin
   * @param {boolean} [options.donut=false] - Whether to create a donut chart
   * @param {number} [options.donutWidth=60] - Width of donut ring
   * @param {Array} [options.colors] - Custom color array
   * @param {boolean} [options.showLegend=true] - Whether to show the legend
   * @param {boolean} [options.showLabels=true] - Whether to show labels on the chart
   * @param {boolean} [options.showPercentages=true] - Whether to show percentages on labels
   * @param {Function} [options.onClick] - Click handler for pie segments
   * @returns {Object} - Chart object with update and export methods
   */
  function createPieChart(selector, options) {
    const {
      data,
      title,
      width = 400,
      height = 400,
      margin = 40,
      donut = false,
      donutWidth = 60,
      colors = defaultColors,
      showLegend = true,
      showLabels = true,
      showPercentages = true,
      onClick = null
    } = options;

    // Validate input
    if (!data || !Array.isArray(data)) {
      console.error('Invalid data provided to pie chart');
      return null;
    }

    // Calculate dimensions
    const radius = Math.min(width, height) / 2 - margin;
    
    // Clear existing content
    const container = d3.select(selector);
    container.html('');
    
    // Create SVG element
    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'radix-pie-chart')
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);
    
    // Add title if provided
    if (title) {
      container.select('svg')
        .append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('class', 'radix-chart-title')
        .text(title);
    }
    
    // Create color scale
    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d.label))
      .range(colors);
    
    // Create pie layout
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);
    
    // Create arc generator
    const arc = d3.arc()
      .innerRadius(donut ? radius - donutWidth : 0)
      .outerRadius(radius);
    
    // Create outer arc for labels
    const outerArc = d3.arc()
      .innerRadius(radius * 1.1)
      .outerRadius(radius * 1.1);
    
    // Create pie segments
    const segments = svg.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');
    
    // Add path elements for each segment
    segments.append('path')
      .attr('d', arc)
      .attr('fill', d => colorScale(d.data.label))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', onClick ? 'pointer' : 'default')
      .on('click', function(event, d) {
        if (onClick) onClick(d.data);
      })
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', d3.arc()
            .innerRadius(donut ? radius - donutWidth : 0)
            .outerRadius(radius + 10));
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc);
      });
    
    // Add labels
    if (showLabels) {
      segments.append('text')
        .attr('transform', d => {
          const pos = outerArc.centroid(d);
          const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
          pos[0] = radius * 0.8 * (midAngle < Math.PI ? 1 : -1);
          return `translate(${pos})`;
        })
        .attr('dy', '.35em')
        .attr('text-anchor', d => {
          const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
          return midAngle < Math.PI ? 'start' : 'end';
        })
        .text(d => {
          const percentage = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);
          return showPercentages 
            ? `${d.data.label} (${percentage}%)` 
            : d.data.label;
        })
        .attr('class', 'radix-pie-label');
      
      // Add polylines connecting slices to labels
      segments.append('polyline')
        .attr('points', d => {
          const pos = outerArc.centroid(d);
          const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
          pos[0] = radius * 0.8 * (midAngle < Math.PI ? 1 : -1);
          return [arc.centroid(d), outerArc.centroid(d), pos];
        })
        .attr('stroke', 'black')
        .attr('fill', 'none')
        .attr('stroke-width', 1);
    }
    
    // Add legend
    if (showLegend) {
      const legend = container.select('svg')
        .append('g')
        .attr('class', 'radix-legend')
        .attr('transform', `translate(${width - 100}, 40)`);
      
      const legendItems = legend.selectAll('.legend-item')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);
      
      legendItems.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', d => colorScale(d.label));
      
      legendItems.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text(d => d.label);
    }
    
    // Export methods
    function exportSVG() {
      const svgElement = container.select('svg').node();
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      return URL.createObjectURL(blob);
    }
    
    function exportPNG() {
      return new Promise((resolve, reject) => {
        const svgElement = container.select('svg').node();
        const svgString = new XMLSerializer().serializeToString(svgElement);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
      });
    }
    
    function updateData(newData) {
      // Update with new data
      const updatedSegments = svg.selectAll('.arc')
        .data(pie(newData));
      
      // Remove old segments
      updatedSegments.exit().remove();
      
      // Update existing segments
      updatedSegments.select('path')
        .transition()
        .duration(500)
        .attrTween('d', function(d) {
          const interpolate = d3.interpolate(this._current, d);
          this._current = interpolate(0);
          return t => arc(interpolate(t));
        });
      
      // Add new segments
      const newSegments = updatedSegments.enter()
        .append('g')
        .attr('class', 'arc');
      
      newSegments.append('path')
        .attr('d', arc)
        .attr('fill', d => colorScale(d.data.label))
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .each(function(d) { this._current = d; });
      
      // Update labels and legend
      // (simplified for brevity)
    }
    
    // Return public API
    return {
      update: updateData,
      exportSVG: exportSVG,
      exportPNG: exportPNG
    };
  }

  /**
   * Creates a data table visualization
   * @param {string} selector - CSS selector for the container element
   * @param {Object} options - Configuration options
   * @param {Array} options.data - Data array of objects
   * @param {Array} options.columns - Column definitions with name and key properties
   * @param {string} [options.title] - Table title
   * @param {boolean} [options.sortable=true] - Whether columns are sortable
   * @param {boolean} [options.paginate=true] - Whether to paginate the table
   * @param {number} [options.pageSize=10] - Number of rows per page
   * @param {boolean} [options.searchable=true] - Whether to include search functionality
   * @param {Function} [options.rowClick] - Click handler for table rows
   * @returns {Object} - Table object with update and export methods
   */
  function createDataTable(selector, options) {
    const {
      data,
      columns,
      title,
      sortable = true,
      paginate = true,
      pageSize = 10,
      searchable = true,
      rowClick = null
    } = options;

    // Validate input
    if (!data || !Array.isArray(data) || !columns || !Array.isArray(columns)) {
      console.error('Invalid data or columns provided to data table');
      return null;
    }

    // State variables
    let currentData = [...data];
    let currentPage = 0;
    let currentSort = { column: null, direction: 'asc' };
    let searchTerm = '';

    // Clear existing content
    const container = d3.select(selector);
    container.html('');
    
    // Create table container
    const tableContainer = container.append('div')
      .attr('class', 'radix-table-container');
    
    // Add title if provided
    if (title) {
      tableContainer.append('h3')
        .attr('class', 'radix-table-title')
        .text(title);
    }
    
    // Add search box if searchable
    if (searchable) {
      const searchContainer = tableContainer.append('div')
        .attr('class', 'radix-table-search');
      
      searchContainer.append('input')
        .attr('type', 'text')
        .attr('placeholder', 'Search...')
        .attr('class', 'radix-table-search-input')
        .on('input', function() {
          searchTerm = this.value.toLowerCase();
          currentPage = 0;
          filterAndRenderTable();
        });
    }
    
    // Create table element
    const table = tableContainer.append('table')
      .attr('class', 'radix-data-table');
    
    // Create table header
    const thead = table.append('thead');
    const headerRow = thead.append('tr');
    
    columns.forEach(column => {
      headerRow.append('th')
        .text(column.name)
        .attr('class', sortable ? 'radix-sortable' : '')
        .style('cursor', sortable ? 'pointer' : 'default')
        .on('click', function() {
          if (!sortable) return;
          
          if (currentSort.column === column.key) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
          } else {
            currentSort.column = column.key;
            currentSort.direction = 'asc';
          }
          
          // Update sort indicators
          headerRow.selectAll('th').classed('sorted-asc', false).classed('sorted-desc', false);
          d3.select(this).classed(`sorted-${currentSort.direction}`, true);
          
          filterAndRenderTable();
        });
    });
    
    // Create table body
    const tbody = table.append('tbody');
    
    // Create pagination if enabled
    let paginationContainer;
    if (paginate) {
      paginationContainer = tableContainer.append('div')
        .attr('class', 'radix-table-pagination');
      
      paginationContainer.append('button')
        .text('Previous')
        .attr('class', 'radix-pagination-prev')
        .on('click', function() {
          if (currentPage > 0) {
            currentPage--;
            renderTable();
            updatePaginationControls();
          }
        });
      
      paginationContainer.append('span')
        .attr('class', 'radix-pagination-info');
      
      paginationContainer.append('button')
        .text('Next')
        .attr('class', 'radix-pagination-next')
        .on('click', function() {
          const maxPage = Math.ceil(currentData.length / pageSize) - 1;
          if (currentPage < maxPage) {
            currentPage++;
            renderTable();
            updatePaginationControls();
          }
        });
    }
    
    // Add export buttons
    const exportContainer = tableContainer.append('div')
      .attr('class', 'radix-table-export');
    
    exportContainer.append('button')
      .text('Export CSV')
      .attr('class', 'radix-export-csv')
      .on('click', exportCSV);
    
    // Function to filter and sort data
    function filterAndRenderTable() {
      // Filter data based on search term
      if (searchTerm) {
        currentData = data.filter(item => {
          return columns.some(column => {
            const value = item[column.key];
            return value && String(value).toLowerCase().includes(searchTerm);
          });
        });
      } else {
        currentData = [...data];
      }
      
      // Sort data if sort column is set
      if (currentSort.column) {
        currentData.sort((a, b) => {
          const valueA = a[currentSort.column];
          const valueB = b[currentSort.column];
          
          // Handle different data types
          if (typeof valueA === 'number' && typeof valueB === 'number') {
            return currentSort.direction === 'asc' ? valueA - valueB : valueB - valueA;
          } else {
            const strA = String(valueA || '').toLowerCase();
            const strB = String(valueB || '').toLowerCase();
            return currentSort.direction === 'asc' 
              ? strA.localeCompare(strB) 
              : strB.localeCompare(strA);
          }
        });
      }
      
      renderTable();
      if (paginate) {
        updatePaginationControls();
      }
    }
    
    // Function to render table rows
    function renderTable() {
      // Clear existing rows
      tbody.html('');
      
      // Calculate slice of data to show
      let displayData;
      if (paginate) {
        const start = currentPage * pageSize;
        const end = start + pageSize;
        displayData = currentData.slice(start, end);
      } else {
        displayData = currentData;
      }
      
      // Create rows
      const rows = tbody.selectAll('tr')
        .data(displayData)
        .enter()
        .append('tr')
        .style('cursor', rowClick ? 'pointer' : 'default')
        .on('click', function(event, d) {
          if (rowClick) rowClick(d);
        });
      
      // Create cells
      rows.selectAll('td')
        .data(d => columns.map(column => ({ key: column.key, value: d[column.key] })))
        .enter()
        .append('td')
        .text(d => d.value);
    }
    
    // Function to update pagination controls
    function updatePaginationControls() {
      const totalPages = Math.ceil(currentData.length / pageSize);
      const start = currentPage * pageSize + 1;
      const end = Math.min((currentPage + 1) * pageSize, currentData.length);
      
      paginationContainer.select('.radix-pagination-info')
        .text(`${start}-${end} of ${currentData.length}`);
      
      paginationContainer.select('.radix-pagination-prev')
        .property('disabled', currentPage === 0);
      
      paginationContainer.select('.radix-pagination-next')
        .property('disabled', currentPage >= totalPages - 1);
    }
    
    // Function to export table as CSV
    function exportCSV() {
      // Create CSV content
      const headerRow = columns.map(column => column.name).join(',');
      const dataRows = currentData.map(item => {
        return columns.map(column => {
          const value = item[column.key];
          // Handle values with commas by quoting
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',');
      }).join('\n');
      
      const csvContent = `${headerRow}\n${dataRows}`;
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${title || 'table'}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // Initialize table
    filterAndRenderTable();
    
    // Return public API
    return {
      update: function(newData) {
        data.length = 0;
        data.push(...newData);
        currentPage = 0;
        filterAndRenderTable();
      },
      exportCSV: exportCSV
    };
  }

  /**
   * Creates a flow diagram visualization
   * @param {string} selector - CSS selector for the container element
   * @param {Object} options - Configuration options
   * @param {Array} options.nodes - Node definitions with id and label properties
   * @param {Array} options.links - Link definitions with source, target, and value properties
   * @param {string} [options.title] - Diagram title
   * @param {number} [options.width=800] - Diagram width
   * @param {number} [options.height=600] - Diagram height
   * @param {Array} [options.colors] - Custom color array
   * @param {Function} [options.nodeClick] - Click handler for nodes
   * @param {Function} [options.linkClick] - Click handler for links
   * @returns {Object} - Diagram object with update and export methods
   */
  function createFlowDiagram(selector, options) {
    const {
      nodes,
      links,
      title,
      width = 800,
      height = 600,
      colors = defaultColors,
      nodeClick = null,
      linkClick = null
    } = options;

    // Validate input
    if (!nodes || !Array.isArray(nodes) || !links || !Array.isArray(links)) {
      console.error('Invalid nodes or links provided to flow diagram');
      return null;
    }

    // Clear existing content
    const container = d3.select(selector);
    container.html('');
    
    // Create SVG element
    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'radix-flow-diagram');
    
    // Add title if provided
    if (title) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('class', 'radix-diagram-title')
        .text(title);
    }
    
    // Create color scale
    const colorScale = d3.scaleOrdinal()
      .domain(nodes.map(d => d.id))
      .range(colors);
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));
    
    // Create links
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value || 1) * 2)
      .attr('fill', 'none')
      .style('cursor', linkClick ? 'pointer' : 'default')
      .on('click', function(event, d) {
        if (linkClick) linkClick(d);
      });
    
    // Create link labels
    const linkLabel = svg.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('dy', -5)
      .append('textPath')
      .attr('href', (d, i) => `#link-path-${i}`)
      .attr('startOffset', '50%')
      .attr('text-anchor', 'middle')
      .text(d => d.label || '');
    
    // Create nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', nodeClick ? 'pointer' : 'default')
      .on('click', function(event, d) {
        if (nodeClick) nodeClick(d);
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));
    
    // Add circles to nodes
    node.append('circle')
      .attr('r', 30)
      .attr('fill', d => colorScale(d.id))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
    
    // Add labels to nodes
    node.append('text')
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(d => d.label)
      .attr('fill', 'white');
    
    // Add title for tooltips
    node.append('title')
      .text(d => d.label);
    
    // Update positions on tick
    simulation.on('tick', () => {
      // Update link paths
      link.attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // Create curved paths
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      })
      .attr('id', (d, i) => `link-path-${i}`);
      
      // Update node positions
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Export methods
    function exportSVG() {
      const svgElement = svg.node();
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      return URL.createObjectURL(blob);
    }
    
    function exportPNG() {
      return new Promise((resolve, reject) => {
        const svgElement = svg.node();
        const svgString = new XMLSerializer().serializeToString(svgElement);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
      });
    }
    
    function updateData(newNodes, newLinks) {
      // Update data
      nodes.length = 0;
      nodes.push(...newNodes);
      
      links.length = 0;
      links.push(...newLinks);
      
      // Update simulation
      simulation.nodes(nodes);
      simulation.force('link').links(links);
      
      // Update visualization
      // (simplified for brevity)
      
      // Restart simulation
      simulation.alpha(1).restart();
    }
    
    // Return public API
    return {
      update: updateData,
      exportSVG: exportSVG,
      exportPNG: exportPNG
    };
  }

  // Return public API
  return {
    createPieChart,
    createDataTable,
    createFlowDiagram
  };
})();
