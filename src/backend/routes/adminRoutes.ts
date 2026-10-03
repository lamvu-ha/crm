import { Router, Request, Response } from 'express';
import { Database } from '../db';
import { authenticateToken, requireSuperAdmin, optionalAuthenticateToken } from '../middleware';

const router = Router();

/**
 * GET /api/admin/audit-logs
 * Filter and view system audit logs (Super Admin only)
 */
router.get('/audit-logs', authenticateToken, requireSuperAdmin, (req: Request, res: Response) => {
  try {
    const { action, userId, targetType, limit = 200 } = req.query;
    let logs = Database.getAuditLogs(Number(limit) || 200);

    if (action && action !== 'ALL') {
      logs = logs.filter((l) => l.action.toLowerCase().includes(String(action).toLowerCase()));
    }

    if (userId) {
      logs = logs.filter((l) => l.userId === String(userId));
    }

    if (targetType) {
      logs = logs.filter((l) => l.targetType === String(targetType));
    }

    return res.json({
      success: true,
      total: logs.length,
      logs
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi tải nhật ký kiểm toán.', details: error?.message });
  }
});

/**
 * GET /api/admin/feature-flags
 * Get all feature flags
 */
router.get('/feature-flags', optionalAuthenticateToken, (_req: Request, res: Response) => {
  try {
    const flags = Database.getFeatureFlags();
    return res.json({ success: true, flags });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi tải danh sách cờ tính năng.', details: error?.message });
  }
});

/**
 * PUT /api/admin/feature-flags/:key and PUT /api/admin/feature-flags
 * Toggle or update feature flags in real time
 */
const handleUpdateFeatureFlag = (req: Request, res: Response) => {
  try {
    const key = req.params.key || req.body.key;
    const { isEnabled, configJson, name, description } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Vui lòng cung cấp key của tính năng.' });
    }

    const updated = Database.updateFeatureFlag(key, {
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : undefined,
      configJson: configJson !== undefined ? configJson : undefined,
      name: name !== undefined ? String(name) : undefined,
      description: description !== undefined ? String(description) : undefined
    });

    if (!updated) {
      return res.status(404).json({ error: `Không tìm thấy cờ tính năng "${key}".` });
    }

    Database.recordAuditLog({
      userId: req.user!.userId,
      userName: req.user!.fullName,
      action: 'UPDATE_FEATURE_FLAG',
      targetType: 'SYSTEM_CONFIG',
      targetId: key,
      details: { key, isEnabled, configJson }
    });

    return res.json({
      success: true,
      flag: updated,
      message: `Đã cập nhật tính năng "${updated.name}" thành công!`
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi cập nhật cờ tính năng.', details: error?.message });
  }
};

router.put('/feature-flags/:key', authenticateToken, requireSuperAdmin, handleUpdateFeatureFlag);
router.put('/feature-flags', authenticateToken, requireSuperAdmin, handleUpdateFeatureFlag);

/**
 * GET /api/admin/ui-config
 * Get all UI configurations (theme, layout, menu, announcement banners)
 */
router.get('/ui-config', optionalAuthenticateToken, (_req: Request, res: Response) => {
  try {
    const configs = Database.getUiConfigs();
    return res.json({ success: true, configs });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi tải cấu hình giao diện CMS.', details: error?.message });
  }
});

/**
 * GET /api/admin/ui-config/:sectionKey
 */
router.get('/ui-config/:sectionKey', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const config = Database.getUiConfigBySection(req.params.sectionKey);
    if (!config) {
      return res.status(404).json({ error: `Không tìm thấy cấu hình cho phân hệ "${req.params.sectionKey}".` });
    }
    return res.json({ success: true, config });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi tải cấu hình phân hệ.', details: error?.message });
  }
});

/**
 * PUT /api/admin/ui-config/:sectionKey and PUT /api/admin/ui-config
 * Update UI configuration (menu, banners, theme colors)
 */
const handleUpdateUiConfig = (req: Request, res: Response) => {
  try {
    const sectionKey = req.params.sectionKey || req.body.sectionKey;
    const { data } = req.body;

    if (!sectionKey || !data) {
      return res.status(400).json({ error: 'Vui lòng cung cấp sectionKey và dữ liệu cấu hình.' });
    }

    const updated = Database.updateUiConfig(sectionKey, data, req.user!.fullName);

    Database.recordAuditLog({
      userId: req.user!.userId,
      userName: req.user!.fullName,
      action: 'UPDATE_UI_CONFIG',
      targetType: 'SYSTEM_CONFIG',
      targetId: sectionKey,
      details: { sectionKey, data }
    });

    return res.json({
      success: true,
      config: updated,
      message: `Đã cập nhật giao diện phân hệ "${sectionKey}" thành công!`
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi cập nhật cấu hình giao diện.', details: error?.message });
  }
};

router.put('/ui-config/:sectionKey', authenticateToken, requireSuperAdmin, handleUpdateUiConfig);
router.put('/ui-config', authenticateToken, requireSuperAdmin, handleUpdateUiConfig);

/**
 * GET /api/admin/custom-fields
 */
router.get('/custom-fields', optionalAuthenticateToken, (_req: Request, res: Response) => {
  try {
    const fields = Database.getCustomFields();
    return res.json({ success: true, fields });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi tải danh sách trường tùy biến.', details: error?.message });
  }
});

/**
 * POST /api/admin/custom-fields
 * Create a new dynamic custom field definition
 */
router.post('/custom-fields', authenticateToken, requireSuperAdmin, (req: Request, res: Response) => {
  try {
    const {
      entityType = 'LEAD',
      fieldKey,
      fieldLabel,
      fieldType = 'TEXT',
      options = [],
      isRequired = false,
      isFilterable = true
    } = req.body;

    if (!fieldKey || !fieldLabel) {
      return res.status(400).json({ error: 'Vui lòng cung cấp mã trường (fieldKey) và nhãn hiển thị (fieldLabel).' });
    }

    const existingFields = Database.getCustomFields();
    if (existingFields.some((f) => f.fieldKey === fieldKey)) {
      return res.status(400).json({ error: `Trường dữ liệu "${fieldKey}" đã tồn tại.` });
    }

    const newField = Database.createCustomField({
      entityType: entityType.toUpperCase() === 'USER' ? 'USER' : 'LEAD',
      fieldKey: String(fieldKey).trim().toLowerCase().replace(/\s+/g, '_'),
      fieldLabel: String(fieldLabel).trim(),
      fieldType,
      options: Array.isArray(options) ? options : [],
      isRequired: Boolean(isRequired),
      isFilterable: Boolean(isFilterable),
      displayOrder: existingFields.length + 1,
      isActive: true
    });

    Database.recordAuditLog({
      userId: req.user!.userId,
      userName: req.user!.fullName,
      action: 'CREATE_CUSTOM_FIELD',
      targetType: 'SYSTEM_CONFIG',
      targetId: newField.id,
      details: { fieldKey: newField.fieldKey, fieldLabel: newField.fieldLabel }
    });

    return res.status(201).json({
      success: true,
      customField: newField,
      message: `Đã tạo trường tùy biến "${newField.fieldLabel}" thành công!`
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi tạo trường tùy biến.', details: error?.message });
  }
});

/**
 * PUT /api/admin/custom-fields/:id
 */
router.put('/custom-fields/:id', authenticateToken, requireSuperAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = Database.updateCustomField(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy trường tùy biến.' });
    }

    Database.recordAuditLog({
      userId: req.user!.userId,
      userName: req.user!.fullName,
      action: 'UPDATE_CUSTOM_FIELD',
      targetType: 'SYSTEM_CONFIG',
      targetId: id,
      details: { updates }
    });

    return res.json({
      success: true,
      customField: updated,
      message: 'Cập nhật trường tùy biến thành công!'
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi cập nhật trường tùy biến.', details: error?.message });
  }
});

/**
 * DELETE /api/admin/custom-fields/:id
 */
router.delete('/custom-fields/:id', authenticateToken, requireSuperAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ok = Database.deleteCustomField(id);
    if (!ok) {
      return res.status(404).json({ error: 'Không tìm thấy trường tùy biến để xóa.' });
    }

    Database.recordAuditLog({
      userId: req.user!.userId,
      userName: req.user!.fullName,
      action: 'DELETE_CUSTOM_FIELD',
      targetType: 'SYSTEM_CONFIG',
      targetId: id
    });

    return res.json({
      success: true,
      message: 'Đã xóa trường tùy biến thành công!'
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi xóa trường tùy biến.', details: error?.message });
  }
});

export default router;
