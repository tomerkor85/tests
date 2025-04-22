const express = require('express');
const router = express.Router();
const { dashboardDb } = require('../database/db');
const auth = require('../middleware/auth');
const { sanitizeInput } = require('../utils/validators');

/**
 * @route   POST /api/dashboards
 * @desc    Create a new dashboard
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { projectId, name, description, layout, isPublic } = req.body;
    
    // Validate input
    if (!projectId || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID and dashboard name are required' 
      });
    }
    
    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = sanitizeInput(description || '');
    
    // Create dashboard
    const dashboard = await dashboardDb.createDashboard(
      projectId,
      { 
        name: sanitizedName, 
        description: sanitizedDescription,
        layout,
        isPublic: !!isPublic
      },
      req.user.userId
    );
    
    res.status(201).json({
      success: true,
      message: 'Dashboard created successfully',
      dashboard
    });
  } catch (err) {
    console.error('Dashboard creation error:', err);
    
    // Handle specific errors
    if (err.message === 'Access denied') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to this project' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating dashboard' 
    });
  }
});

/**
 * @route   GET /api/dashboards/project/:projectId
 * @desc    Get all dashboards for a project
 * @access  Private
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get dashboards
    const dashboards = await dashboardDb.getProjectDashboards(projectId, req.user.userId);
    
    res.status(200).json({
      success: true,
      count: dashboards.length,
      dashboards
    });
  } catch (err) {
    console.error('Get dashboards error:', err);
    
    // Handle specific errors
    if (err.message === 'Access denied') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to this project' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error retrieving dashboards' 
    });
  }
});

/**
 * @route   GET /api/dashboards/:id
 * @desc    Get dashboard by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get dashboard
    const dashboard = await dashboardDb.getDashboardById(id, req.user.userId);
    
    res.status(200).json({
      success: true,
      dashboard
    });
  } catch (err) {
    console.error('Get dashboard error:', err);
    
    // Handle specific errors
    if (err.message === 'Dashboard not found or access denied') {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found or access denied' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error retrieving dashboard' 
    });
  }
});

/**
 * @route   POST /api/dashboards/:id/widgets
 * @desc    Add widget to dashboard
 * @access  Private
 */
router.post('/:id/widgets',  async (req, res) => {
  try {
    const { id } = req.params;
    const { widgetType, title, query, position, settings } = req.body;
    
    // Validate input
    if (!widgetType || !title || !query || !position) {
      return res.status(400).json({ 
        success: false, 
        message: 'Widget type, title, query, and position are required' 
      });
    }
    
    // Sanitize title
    const sanitizedTitle = sanitizeInput(title);
    
    // Add widget to dashboard
    const widget = await dashboardDb.addDashboardWidget(
      id,
      {
        widgetType,
        title: sanitizedTitle,
        query,
        position,
        settings
      },
      req.user.userId
    );
    
    res.status(201).json({
      success: true,
      message: 'Widget added successfully',
      widget
    });
  } catch (err) {
    console.error('Add dashboard widget error:', err);
    
    // Handle specific errors
    if (err.message === 'Access denied') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to this dashboard' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error adding widget' 
    });
  }
});

/**
 * @route   PUT /api/dashboards/:id/layout
 * @desc    Update dashboard layout
 * @access  Private
 */
router.put('/:id/layout', async (req, res) => {
  try {
    const { id } = req.params;
    const { layout } = req.body;
    
    // Validate input
    if (!layout) {
      return res.status(400).json({ 
        success: false, 
        message: 'Layout is required' 
      });
    }
    
    // Update dashboard layout
    const dashboard = await dashboardDb.updateDashboardLayout(id, layout, req.user.userId);
    
    res.status(200).json({
      success: true,
      message: 'Dashboard layout updated successfully',
      dashboard
    });
  } catch (err) {
    console.error('Update dashboard layout error:', err);
    
    // Handle specific errors
    if (err.message === 'Dashboard not found') {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    } else if (err.message === 'Access denied') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to update this dashboard' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating dashboard layout' 
    });
  }
});

/**
 * @route   DELETE /api/dashboards/:id/widgets/:widgetId
 * @desc    Remove widget from dashboard
 * @access  Private
 */
router.delete('/:id/widgets/:widgetId', async (req, res) => {
  try {
    const { id, widgetId } = req.params;
    
    // Remove widget from dashboard
    await dashboardDb.removeDashboardWidget(id, widgetId, req.user.userId);
    
    res.status(200).json({
      success: true,
      message: 'Widget removed successfully'
    });
  } catch (err) {
    console.error('Remove dashboard widget error:', err);
    
    // Handle specific errors
    if (err.message === 'Widget not found') {
      return res.status(404).json({ 
        success: false, 
        message: 'Widget not found' 
      });
    } else if (err.message === 'Access denied') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to update this dashboard' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error removing widget' 
    });
  }
});

/**
 * @route   DELETE /api/dashboards/:id
 * @desc    Delete dashboard
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete dashboard
    await dashboardDb.deleteDashboard(id, req.user.userId);
    
    res.status(200).json({
      success: true,
      message: 'Dashboard deleted successfully'
    });
  } catch (err) {
    console.error('Delete dashboard error:', err);
    
    // Handle specific errors
    if (err.message === 'Dashboard not found') {
      return res.status(404).json({ 
        success: false, 
        message: 'Dashboard not found' 
      });
    } else if (err.message === 'Access denied') {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have access to delete this dashboard' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting dashboard' 
    });
  }
});

module.exports = router;
