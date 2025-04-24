const express = require('express');
const router = express.Router();
const { projectDb } = require('../../core/db/postgres-db');
const auth = require('../middlewares/auth');
const paths = require('../../paths');
const { sanitizeInput } = require(paths.utils + '/validators');
const { sendProjectInvitationEmail } = require(paths.utils + '/email');

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = sanitizeInput(description || '');

    // Create project
    const project = await projectDb.createProject(
      { name: sanitizedName, description: sanitizedDescription },
      req.user.userId
    );

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  } catch (err) {
    console.error('Project creation error:', err);

    res.status(500).json({
      success: false,
      message: 'Server error creating project'
    });
  }
});

/**
 * @route   GET /api/projects
 * @desc    Get all projects for current user
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    // Get projects
    const projects = await projectDb.getUserProjects(req.user.userId);

    res.status(200).json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (err) {
    console.error('Get projects error:', err);

    res.status(500).json({
      success: false,
      message: 'Server error retrieving projects'
    });
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get project by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get project
    const project = await projectDb.getProjectById(id, req.user.userId);

    res.status(200).json({
      success: true,
      project
    });
  } catch (err) {
    console.error('Get project error:', err);

    // Handle specific errors
    if (err.message === 'Project not found') {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    } else if (err.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error retrieving project'
    });
  }
});

/**
 * @route   POST /api/projects/:id/members
 * @desc    Add member to project
 * @access  Private
 */
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate role
    const validRoles = ['admin', 'editor', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(', ')}`
      });
    }

    // Add member to project
    const result = await projectDb.addProjectMember(
      id,
      email,
      role || 'viewer',
      req.user.userId
    );

    // Get project name for email
    const project = await projectDb.getProjectById(id, req.user.userId);

    // Send invitation email
    await sendProjectInvitationEmail(
      email,
      project.name,
      `${req.user.firstName} ${req.user.lastName}`
    );

    res.status(200).json({
      success: true,
      message: 'Project member added successfully',
      member: result
    });
  } catch (err) {
    console.error('Add project member error:', err);

    // Handle specific errors
    if (err.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    } else if (err.message === 'Only project admins can add members') {
      return res.status(403).json({
        success: false,
        message: 'Only project admins can add members'
      });
    } else if (err.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error adding project member'
    });
  }
});

/**
 * @route   DELETE /api/projects/:id/members/:userId
 * @desc    Remove member from project
 * @access  Private
 */
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if user is project admin
    const project = await projectDb.getProjectById(id, req.user.userId);
    const currentUserRole = project.members.find(m => m.user_id === req.user.userId)?.role;

    if (currentUserRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only project admins can remove members'
      });
    }

    // Check if user is trying to remove themselves
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove yourself from the project'
      });
    }

    // Check if user is trying to remove the project creator
    if (userId === project.created_by) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove the project creator'
      });
    }

    // Remove member from project
    await projectDb.removeProjectMember(id, userId);

    res.status(200).json({
      success: true,
      message: 'Project member removed successfully'
    });
  } catch (err) {
    console.error('Remove project member error:', err);

    // Handle specific errors
    if (err.message === 'Project not found') {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    } else if (err.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found in project'
      });
    } else if (err.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error removing project member'
    });
  }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check if user is project admin
    const project = await projectDb.getProjectById(id, req.user.userId);
    const currentUserRole = project.members.find(m => m.user_id === req.user.userId)?.role;

    if (currentUserRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only project admins can update project details'
      });
    }

    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = sanitizeInput(description || '');

    // Update project
    const updatedProject = await projectDb.updateProject(
      id,
      { name: sanitizedName, description: sanitizedDescription }
    );

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (err) {
    console.error('Update project error:', err);

    // Handle specific errors
    if (err.message === 'Project not found') {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    } else if (err.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this project'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating project'
    });
  }
});

module.exports = router;
