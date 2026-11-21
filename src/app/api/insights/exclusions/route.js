/**
 * Insights scan exclusions API.
 *
 * GET    - Return the full list of exclusion entries with enabled state
 * PUT    - Update exclusion settings (enable/disable defaults, add/remove custom)
 * DELETE - Restore all exclusions to defaults
 */

import {
  getExclusions,
  setExclusionEnabled,
  addCustomExclusion,
  removeCustomExclusion,
  restoreDefaults,
  DEFAULT_EXCLUSIONS,
  EXCLUSION_CATEGORIES,
} from '@/lib/insights/exclusions';

/**
 * GET - Return all exclusion entries with enabled state.
 */
export async function GET() {
  try {
    const exclusions = await getExclusions();

    // Group by category for easier UI rendering
    const grouped = {};
    for (const category of Object.keys(EXCLUSION_CATEGORIES)) {
      const items = exclusions.filter(e => e.category === category);
      if (items.length > 0) {
        grouped[category] = items;
      }
    }

    return Response.json({
      success: true,
      data: {
        exclusions,
        grouped,
        categories: EXCLUSION_CATEGORIES,
        defaults: DEFAULT_EXCLUSIONS,
      },
    });
  } catch (error) {
    console.error('Exclusions GET error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update exclusion settings.
 *
 * Body:
 *   { toggle?: { name: string, enabled: boolean } }
 *   { addCustom?: string }
 *   { removeCustom?: string }
 */
export async function PUT(request) {
  try {
    const body = await request.json();

    // Toggle a default exclusion
    if (body.toggle) {
      const { name, enabled } = body.toggle;
      if (typeof name !== 'string' || typeof enabled !== 'boolean') {
        return Response.json(
          { success: false, error: 'toggle requires name (string) and enabled (boolean)' },
          { status: 400 }
        );
      }
      await setExclusionEnabled(name, enabled);
      const exclusions = await getExclusions();
      return Response.json({ success: true, data: { exclusions } });
    }

    // Add a custom exclusion
    if (body.addCustom) {
      const result = await addCustomExclusion(body.addCustom);
      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
      const exclusions = await getExclusions();
      return Response.json({ success: true, data: { exclusions } });
    }

    // Remove a custom exclusion
    if (body.removeCustom) {
      await removeCustomExclusion(body.removeCustom);
      const exclusions = await getExclusions();
      return Response.json({ success: true, data: { exclusions } });
    }

    return Response.json(
      { success: false, error: 'Provide toggle, addCustom, or removeCustom' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Exclusions PUT error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Restore all exclusions to defaults.
 */
export async function DELETE() {
  try {
    await restoreDefaults();
    const exclusions = await getExclusions();
    return Response.json({
      success: true,
      message: 'Exclusions restored to defaults',
      data: { exclusions },
    });
  } catch (error) {
    console.error('Exclusions DELETE error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
