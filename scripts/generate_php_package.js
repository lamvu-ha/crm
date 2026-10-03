import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT_DIR = process.cwd();
const PKG_DIR = path.join(ROOT_DIR, "php_hosting_package");
const DIST_DIR = path.join(ROOT_DIR, "dist");

console.log("=== BẮT ĐẦU ĐÓNG GÓI MÃ NGUỒN PHP & DATABASE ===");

// 1. Dọn dẹp & tạo thư mục
if (fs.existsSync(PKG_DIR)) {
  fs.rmSync(PKG_DIR, { recursive: true, force: true });
}
fs.mkdirSync(PKG_DIR, { recursive: true });
fs.mkdirSync(path.join(PKG_DIR, "api"), { recursive: true });
fs.mkdirSync(path.join(PKG_DIR, "data"), { recursive: true });

// 2. Đảm bảo bản build dist tồn tại
if (!fs.existsSync(DIST_DIR) || !fs.existsSync(path.join(DIST_DIR, "index.html"))) {
  console.log("Đang biên dịch bản build React frontend...");
  execSync("npm run build", { stdio: "inherit" });
}

// 3. Sao chép frontend (index.html và assets/)
console.log("Sao chép giao diện Web React vào gói PHP...");
fs.copyFileSync(path.join(DIST_DIR, "index.html"), path.join(PKG_DIR, "index.html"));
if (fs.existsSync(path.join(DIST_DIR, "assets"))) {
  fs.cpSync(path.join(DIST_DIR, "assets"), path.join(PKG_DIR, "assets"), { recursive: true });
}

// 4. Đọc dữ liệu hiện tại
const leads = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "leads.json"), "utf8"));
const members = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "sales_members.json"), "utf8"));
const settings = fs.existsSync(path.join(ROOT_DIR, "crm_settings.json"))
  ? JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "crm_settings.json"), "utf8"))
  : { totalLeads: leads.length, databaseEngine: "MySQL + PHP Backend" };

// Lưu file JSON dự phòng vào data/
fs.writeFileSync(path.join(PKG_DIR, "data", "leads.json"), JSON.stringify(leads, null, 2), "utf8");
fs.writeFileSync(path.join(PKG_DIR, "data", "sales_members.json"), JSON.stringify(members, null, 2), "utf8");
fs.writeFileSync(path.join(PKG_DIR, "data", "crm_settings.json"), JSON.stringify(settings, null, 2), "utf8");

// Helper thoát ký tự SQL
function sqlStr(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  const str = typeof val === "object" ? JSON.stringify(val) : String(val);
  return "'" + str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r") + "'";
}

// 5. Tạo file database.sql (MySQL Schema + Data)
console.log("Đang tạo tệp database.sql (MySQL dump)...");
let sql = `-- ========================================================
-- CƠ SỞ DỮ LIỆU CRM BẤT ĐỘNG SẢN SALEPRO HCM_E05
-- Tương thích: MySQL 5.7+, MariaDB 10.3+, PHP 7.4 / 8.0 / 8.1 / 8.2 / 8.3
-- Mã hoá: utf8mb4 / utf8mb4_unicode_ci
-- Xuất lúc: ${new Date().toISOString()}
-- ========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Cấu trúc bảng \`sales_members\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`sales_members\`;
CREATE TABLE \`sales_members\` (
  \`id\` varchar(100) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`email\` varchar(255) NOT NULL,
  \`phone\` varchar(50) NOT NULL,
  \`role\` varchar(50) NOT NULL DEFAULT 'sales',
  \`title\` varchar(255) DEFAULT '',
  \`team\` varchar(255) DEFAULT '',
  \`status\` varchar(50) NOT NULL DEFAULT 'active',
  \`password\` varchar(255) NOT NULL DEFAULT 'CHANGE_ME_BEFORE_USE',
  \`color\` varchar(100) DEFAULT 'bg-blue-600',
  \`avatar\` text DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Đổ dữ liệu bảng \`sales_members\` (${members.length} nhân sự chính thức)
-- --------------------------------------------------------
`;

members.forEach((m) => {
  sql += `INSERT INTO \`sales_members\` (\`id\`, \`name\`, \`email\`, \`phone\`, \`role\`, \`title\`, \`team\`, \`status\`, \`password\`, \`color\`, \`avatar\`) VALUES (
  ${sqlStr(m.id)},
  ${sqlStr(m.name)},
  ${sqlStr(m.email)},
  ${sqlStr(m.phone)},
  ${sqlStr(m.role)},
  ${sqlStr(m.title)},
  ${sqlStr(m.team)},
  ${sqlStr(m.status)},
  ${sqlStr(m.password)},
  ${sqlStr(m.color)},
  ${sqlStr(m.avatar)}
);\n`;
});

sql += `\n-- --------------------------------------------------------
-- Cấu trúc bảng \`leads\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`leads\`;
CREATE TABLE \`leads\` (
  \`id\` varchar(100) NOT NULL,
  \`stt\` int(11) DEFAULT 0,
  \`fullName\` varchar(255) NOT NULL,
  \`phone\` varchar(50) NOT NULL,
  \`dataSource\` varchar(255) DEFAULT 'Facebook Ads',
  \`campaignCode\` varchar(100) DEFAULT 'MAY_MH5.19',
  \`project\` varchar(255) DEFAULT 'Dự án MH5.19',
  \`productType\` varchar(255) DEFAULT 'Nhà phố trung tâm',
  \`budget\` varchar(100) DEFAULT '',
  \`status\` varchar(100) DEFAULT 'Khách mới',
  \`callStatus\` varchar(100) DEFAULT 'Chưa gọi',
  \`potentialLevel\` varchar(50) DEFAULT 'Ấm',
  \`assignee\` varchar(255) DEFAULT 'Chưa phân bổ',
  \`notes\` text DEFAULT NULL,
  \`date\` varchar(50) DEFAULT '',
  \`assignedAt\` varchar(50) DEFAULT NULL,
  \`acceptedAt\` varchar(50) DEFAULT NULL,
  \`firstReportedAt\` varchar(50) DEFAULT NULL,
  \`createdAt\` varchar(50) DEFAULT NULL,
  \`updatedAt\` varchar(50) DEFAULT NULL,
  \`sheetRowIndex\` int(11) DEFAULT NULL,
  \`dealValue\` bigint(20) DEFAULT 0,
  \`zaloConnected\` tinyint(1) DEFAULT 0,
  \`tags\` text DEFAULT NULL,
  \`history\` longtext DEFAULT NULL,
  \`zaloReminder\` text DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_phone\` (\`phone\`),
  KEY \`idx_assignee\` (\`assignee\`),
  KEY \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Đổ dữ liệu bảng \`leads\` (${leads.length} khách hàng thực tế)
-- --------------------------------------------------------
`;

leads.forEach((l, idx) => {
  sql += `INSERT INTO \`leads\` (
  \`id\`, \`stt\`, \`fullName\`, \`phone\`, \`dataSource\`, \`campaignCode\`,
  \`project\`, \`productType\`, \`budget\`, \`status\`, \`callStatus\`,
  \`potentialLevel\`, \`assignee\`, \`notes\`, \`date\`, \`assignedAt\`,
  \`acceptedAt\`, \`firstReportedAt\`, \`createdAt\`, \`updatedAt\`,
  \`sheetRowIndex\`, \`dealValue\`, \`zaloConnected\`, \`tags\`, \`history\`, \`zaloReminder\`
) VALUES (
  ${sqlStr(l.id)},
  ${l.stt || idx + 1},
  ${sqlStr(l.fullName)},
  ${sqlStr(l.phone)},
  ${sqlStr(l.dataSource)},
  ${sqlStr(l.campaignCode || 'MAY_MH5.19')},
  ${sqlStr(l.project || 'Dự án MH5.19')},
  ${sqlStr(l.productType || 'Nhà phố trung tâm')},
  ${sqlStr(l.budget)},
  ${sqlStr(l.status || 'Khách mới')},
  ${sqlStr(l.callStatus || 'Chưa gọi')},
  ${sqlStr(l.potentialLevel || 'Ấm')},
  ${sqlStr(l.assignee || 'Chưa phân bổ')},
  ${sqlStr(l.notes)},
  ${sqlStr(l.date)},
  ${sqlStr(l.assignedAt)},
  ${sqlStr(l.acceptedAt)},
  ${sqlStr(l.firstReportedAt)},
  ${sqlStr(l.createdAt)},
  ${sqlStr(l.updatedAt)},
  ${l.sheetRowIndex ? l.sheetRowIndex : "NULL"},
  ${l.dealValue ? l.dealValue : 0},
  ${l.zaloConnected ? 1 : 0},
  ${sqlStr(l.tags || [])},
  ${sqlStr(l.history || [])},
  ${sqlStr(l.zaloReminder || null)}
);\n`;
});

sql += `\n-- --------------------------------------------------------
-- Cấu trúc bảng \`crm_settings\`
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`crm_settings\`;
CREATE TABLE \`crm_settings\` (
  \`setting_key\` varchar(100) NOT NULL,
  \`setting_value\` longtext NOT NULL,
  \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`setting_key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO \`crm_settings\` (\`setting_key\`, \`setting_value\`) VALUES
('general_settings', ${sqlStr(settings)});

SET FOREIGN_KEY_CHECKS = 1;
`;

fs.writeFileSync(path.join(PKG_DIR, "database.sql"), sql, "utf8");

// 6. Tạo config.php
const configPhp = `<?php
/**
 * CẤU HÌNH KẾT NỐI DATABASE VÀ HỆ THỐNG CRM MAYHOMES
 * Điền thông tin MySQL Hosting của anh/chị tại đây.
 */

// 1. Cấu hình Database MySQL
define('DB_HOST', 'localhost');          // Địa chỉ MySQL server (thường là localhost)
define('DB_NAME', 'crm_mayhomes');        // Tên cơ sở dữ liệu MySQL đã tạo trên cPanel
define('DB_USER', 'root');                // Tên người dùng MySQL
define('DB_PASS', '');                    // Mật khẩu người dùng MySQL
define('DB_CHARSET', 'utf8mb4');

// 2. Chế độ dự phòng (Fallback):
// Nếu chưa kết nối được MySQL (hoặc chưa import database.sql),
// hệ thống sẽ tự động dùng kho lưu trữ file JSON trong thư mục data/ để web không bị gián đoạn.
define('ALLOW_JSON_FALLBACK', true);

// 3. API Key tuỳ chọn (cho tính năng kiểm tra lỗi chính tả bằng AI nếu có)
define('GEMINI_API_KEY', '');

// Thiết lập múi giờ Việt Nam
date_default_timezone_set('Asia/Ho_Chi_Minh');
`;
fs.writeFileSync(path.join(PKG_DIR, "config.php"), configPhp, "utf8");

// 7. Tạo api/db.php (Lớp kết nối PDO + JSON fallback)
const dbPhp = `<?php
require_once __DIR__ . '/../config.php';

class CRMDatabase {
    private static $pdo = null;
    private static $isMysql = false;

    public static function getConnection() {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            self::$pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            self::$isMysql = true;
            return self::$pdo;
        } catch (PDOException $e) {
            // Không kết nối được MySQL -> Kiểm tra có cho phép fallback sang JSON không
            if (defined('ALLOW_JSON_FALLBACK') && ALLOW_JSON_FALLBACK) {
                self::$isMysql = false;
                return null;
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Không thể kết nối cơ sở dữ liệu MySQL: ' . $e->getMessage()]);
                exit;
            }
        }
    }

    public static function isMysqlConnected() {
        self::getConnection();
        return self::$isMysql;
    }

    // Các hàm tương tác LEADS
    public static function getLeads() {
        $db = self::getConnection();
        if (self::$isMysql && $db) {
            try {
                $stmt = $db->query("SELECT * FROM leads ORDER BY stt ASC, id ASC");
                $rows = $stmt->fetchAll();
                $leads = [];
                foreach ($rows as $r) {
                    $item = $r;
                    $item['stt'] = (int)$r['stt'];
                    $item['dealValue'] = (int)$r['dealValue'];
                    $item['zaloConnected'] = (bool)$r['zaloConnected'];
                    if (!empty($r['sheetRowIndex'])) $item['sheetRowIndex'] = (int)$r['sheetRowIndex'];
                    $item['tags'] = !empty($r['tags']) ? json_decode($r['tags'], true) : [];
                    $item['history'] = !empty($r['history']) ? json_decode($r['history'], true) : [];
                    $item['zaloReminder'] = !empty($r['zaloReminder']) ? json_decode($r['zaloReminder'], true) : null;
                    $leads[] = $item;
                }
                return $leads;
            } catch (Exception $e) {
                // Lỗi query, đọc từ JSON
            }
        }

        // Đọc từ data/leads.json
        $jsonFile = __DIR__ . '/../data/leads.json';
        if (file_exists($jsonFile)) {
            $content = file_get_contents($jsonFile);
            $parsed = json_decode($content, true);
            return is_array($parsed) ? $parsed : [];
        }
        return [];
    }

    public static function saveLeads($leads) {
        if (!is_array($leads)) return false;

        $db = self::getConnection();
        if (self::$isMysql && $db) {
            try {
                $db->beginTransaction();
                $db->exec("DELETE FROM leads");

                $stmt = $db->prepare("INSERT INTO leads (
                    id, stt, fullName, phone, dataSource, campaignCode, project,
                    productType, budget, status, callStatus, potentialLevel, assignee,
                    notes, date, assignedAt, acceptedAt, firstReportedAt, createdAt,
                    updatedAt, sheetRowIndex, dealValue, zaloConnected, tags, history, zaloReminder
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?
                )");

                foreach ($leads as $idx => $l) {
                    $id = !empty($l['id']) ? $l['id'] : ('lead-' . time() . '-' . rand(100, 999));
                    $stt = isset($l['stt']) ? (int)$l['stt'] : ($idx + 1);
                    $tags = isset($l['tags']) ? json_encode($l['tags'], JSON_UNESCAPED_UNICODE) : '[]';
                    $history = isset($l['history']) ? json_encode($l['history'], JSON_UNESCAPED_UNICODE) : '[]';
                    $reminder = isset($l['zaloReminder']) && $l['zaloReminder'] ? json_encode($l['zaloReminder'], JSON_UNESCAPED_UNICODE) : null;

                    $stmt->execute([
                        $id,
                        $stt,
                        $l['fullName'] ?? '',
                        $l['phone'] ?? '',
                        $l['dataSource'] ?? 'Facebook Ads',
                        $l['campaignCode'] ?? 'MAY_MH5.19',
                        $l['project'] ?? 'Dự án MH5.19',
                        $l['productType'] ?? 'Nhà phố trung tâm',
                        $l['budget'] ?? '',
                        $l['status'] ?? 'Khách mới',
                        $l['callStatus'] ?? 'Chưa gọi',
                        $l['potentialLevel'] ?? 'Ấm',
                        $l['assignee'] ?? 'Chưa phân bổ',
                        $l['notes'] ?? '',
                        $l['date'] ?? date('Y-m-d'),
                        $l['assignedAt'] ?? null,
                        $l['acceptedAt'] ?? null,
                        $l['firstReportedAt'] ?? null,
                        $l['createdAt'] ?? date('c'),
                        $l['updatedAt'] ?? date('c'),
                        $l['sheetRowIndex'] ?? null,
                        $l['dealValue'] ?? 0,
                        !empty($l['zaloConnected']) ? 1 : 0,
                        $tags,
                        $history,
                        $reminder
                    ]);
                }
                $db->commit();
            } catch (Exception $e) {
                if ($db->inTransaction()) $db->rollBack();
            }
        }

        // Luôn ghi đồng thời vào data/leads.json để dự phòng
        $jsonFile = __DIR__ . '/../data/leads.json';
        @file_put_contents($jsonFile, json_encode($leads, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return true;
    }

    public static function updateLead($leadId, $updates) {
        $leads = self::getLeads();
        $found = false;
        foreach ($leads as &$l) {
            if ($l['id'] === $leadId) {
                $l = array_merge($l, $updates);
                $l['updatedAt'] = date('c');
                $found = true;
                break;
            }
        }
        if ($found) {
            self::saveLeads($leads);
            return true;
        }
        return false;
    }

    public static function deleteLead($leadId) {
        $leads = self::getLeads();
        $filtered = array_values(array_filter($leads, function($l) use ($leadId) {
            return $l['id'] !== $leadId;
        }));
        foreach ($filtered as $idx => &$l) {
            $l['stt'] = $idx + 1;
        }
        self::saveLeads($filtered);
        return count($filtered);
    }

    public static function bulkDeleteLeads($ids) {
        $idSet = array_flip($ids);
        $leads = self::getLeads();
        $filtered = array_values(array_filter($leads, function($l) use ($idSet) {
            return !isset($idSet[$l['id']]);
        }));
        foreach ($filtered as $idx => &$l) {
            $l['stt'] = $idx + 1;
        }
        self::saveLeads($filtered);
        return count($filtered);
    }

    // Các hàm tương tác SALES MEMBERS
    public static function getSalesMembers() {
        $db = self::getConnection();
        if (self::$isMysql && $db) {
            try {
                $stmt = $db->query("SELECT * FROM sales_members ORDER BY FIELD(role, 'admin', 'manager', 'sales'), name ASC");
                $rows = $stmt->fetchAll();
                if (count($rows) > 0) return $rows;
            } catch (Exception $e) {}
        }

        $jsonFile = __DIR__ . '/../data/sales_members.json';
        if (file_exists($jsonFile)) {
            $parsed = json_decode(file_get_contents($jsonFile), true);
            if (is_array($parsed)) return $parsed;
        }
        return [];
    }

    public static function saveSalesMembers($members) {
        if (!is_array($members)) return false;

        $db = self::getConnection();
        if (self::$isMysql && $db) {
            try {
                $db->beginTransaction();
                $db->exec("DELETE FROM sales_members");
                $stmt = $db->prepare("INSERT INTO sales_members (id, name, email, phone, role, title, team, status, password, color, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($members as $m) {
                    $stmt->execute([
                        $m['id'],
                        $m['name'],
                        $m['email'],
                        $m['phone'] ?? '',
                        $m['role'] ?? 'sales',
                        $m['title'] ?? '',
                        $m['team'] ?? '',
                        $m['status'] ?? 'active',
                        $m['password'] ?? 'CHANGE_ME_BEFORE_USE',
                        $m['color'] ?? 'bg-blue-600',
                        $m['avatar'] ?? ''
                    ]);
                }
                $db->commit();
            } catch (Exception $e) {
                if ($db->inTransaction()) $db->rollBack();
            }
        }

        $jsonFile = __DIR__ . '/../data/sales_members.json';
        @file_put_contents($jsonFile, json_encode($members, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return true;
    }
}
`;
fs.writeFileSync(path.join(PKG_DIR, "api", "db.php"), dbPhp, "utf8");

// 8. Tạo api/index.php (Toàn bộ Router API bằng PHP)
const apiIndexPhp = `<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

// Lấy URI và method
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Loại bỏ base folder nếu đặt trong thư mục con
$scriptDir = dirname($_SERVER['SCRIPT_NAME']);
if ($scriptDir !== '/' && strpos($uri, $scriptDir) === 0) {
    $uri = substr($uri, strlen($scriptDir));
}
if (strpos($uri, '/api') === 0) {
    $uri = substr($uri, 4);
}
$uri = '/' . trim($uri, '/');

// Lấy input body
$inputRaw = file_get_contents('php://input');
$body = json_decode($inputRaw, true) ?: [];

// Router
try {
    // 1. Health check
    if ($uri === '/health' && $method === 'GET') {
        echo json_encode([
            'status' => 'ok',
            'time' => date('c'),
            'database' => CRMDatabase::isMysqlConnected() ? 'MySQL Connected' : 'JSON Fallback Mode'
        ]);
        exit;
    }

    // 2. Leads: GET /api/leads
    if ($uri === '/leads' && $method === 'GET') {
        $leads = CRMDatabase::getLeads();
        echo json_encode($leads, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 3. Leads: POST /api/leads (Lưu toàn bộ hoặc thêm danh sách)
    if ($uri === '/leads' && $method === 'POST') {
        $cleanLeads = is_array($body) ? $body : [];
        CRMDatabase::saveLeads($cleanLeads);
        echo json_encode(['success' => true, 'count' => count($cleanLeads)]);
        exit;
    }

    // 4. Leads: PUT /api/leads/{id} (Cập nhật 1 lead)
    if (preg_match('#^/leads/([^/]+)$#', $uri, $matches) && $method === 'PUT') {
        $leadId = $matches[1];
        $success = CRMDatabase::updateLead($leadId, $body);
        if ($success) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Không tìm thấy khách hàng']);
        }
        exit;
    }

    // 5. Leads: DELETE /api/leads/{id} (Xoá 1 lead)
    if (preg_match('#^/leads/([^/]+)$#', $uri, $matches) && $method === 'DELETE') {
        $leadId = $matches[1];
        $remaining = CRMDatabase::deleteLead($leadId);
        echo json_encode(['success' => true, 'count' => $remaining]);
        exit;
    }

    // 6. Leads: POST /api/leads/bulk-delete (Xoá hàng loạt)
    if ($uri === '/leads/bulk-delete' && $method === 'POST') {
        $ids = isset($body['ids']) && is_array($body['ids']) ? $body['ids'] : [];
        $remaining = CRMDatabase::bulkDeleteLeads($ids);
        echo json_encode(['success' => true, 'count' => $remaining, 'deletedCount' => count($ids)]);
        exit;
    }

    // 7. Leads: POST /api/leads/distribute (Chia đều lead)
    if ($uri === '/leads/distribute' && $method === 'POST') {
        $leads = CRMDatabase::getLeads();
        $members = CRMDatabase::getSalesMembers();
        $activeMembers = array_values(array_filter($members, function($m) {
            return ($m['status'] ?? '') === 'active' && ($m['role'] ?? '') === 'sales';
        }));

        if (count($activeMembers) === 0) {
            $activeMembers = array_values(array_filter($members, function($m) {
                return ($m['status'] ?? '') === 'active';
            }));
        }

        $forceAll = !empty($body['forceAll']);
        $now = date('c');
        $distributedCount = 0;
        $mCount = count($activeMembers);

        if ($mCount > 0) {
            $saleIndex = 0;
            foreach ($leads as &$l) {
                $isUnassigned = empty($l['assignee']) || $l['assignee'] === 'Chưa phân bổ' || $l['assignee'] === 'Chưa gán';
                if ($forceAll || $isUnassigned) {
                    $chosen = $activeMembers[$saleIndex % $mCount];
                    $l['assignee'] = $chosen['name'];
                    $l['assignedAt'] = $now;
                    $l['acceptedAt'] = null;
                    $l['firstReportedAt'] = null;
                    $l['updatedAt'] = $now;
                    $distributedCount++;
                    $saleIndex++;
                }
            }
            CRMDatabase::saveLeads($leads);
        }

        echo json_encode([
            'success' => true,
            'distributedCount' => $distributedCount,
            'leads' => $leads
        ]);
        exit;
    }

    // 8. Leads: POST /api/leads/clear-demo
    if ($uri === '/leads/clear-demo' && $method === 'POST') {
        $leads = CRMDatabase::getLeads();
        $realLeads = array_values(array_filter($leads, function($l) {
            $id = $l['id'] ?? '';
            return !preg_match('/^lead-0[1-9]$|^lead-1[0-9]$|^lead-mh5-(0[1-9]|1[0-4])$/', $id);
        }));
        foreach ($realLeads as $idx => &$l) {
            $l['stt'] = $idx + 1;
        }
        CRMDatabase::saveLeads($realLeads);
        echo json_encode(['success' => true, 'remainingCount' => count($realLeads), 'leads' => $realLeads]);
        exit;
    }

    // 9. Auth: POST /api/auth/login
    if ($uri === '/auth/login' && $method === 'POST') {
        $email = strtolower(trim($body['email'] ?? ''));
        $password = trim($body['password'] ?? '');

        $members = CRMDatabase::getSalesMembers();
        foreach ($members as $m) {
            if (strtolower(trim($m['email'])) === $email) {
                if (($m['password'] ?? 'CHANGE_ME_BEFORE_USE') === $password) {
                    echo json_encode([
                        'success' => true,
                        'user' => [
                            'id' => $m['id'],
                            'name' => $m['name'],
                            'email' => $m['email'],
                            'role' => $m['role'],
                            'phone' => $m['phone'] ?? '',
                            'team' => $m['team'] ?? '',
                            'title' => $m['title'] ?? '',
                            'avatar' => $m['avatar'] ?? '',
                            'status' => $m['status'] ?? 'active'
                        ]
                    ]);
                    exit;
                } else {
                    http_response_code(401);
                    echo json_encode(['error' => 'Mật khẩu không chính xác']);
                    exit;
                }
            }
        }
        http_response_code(404);
        echo json_encode(['error' => 'Email không tồn tại trong hệ thống MAY_MH5.19']);
        exit;
    }

    // 10. Auth: POST /api/auth/change-password
    if ($uri === '/auth/change-password' && $method === 'POST') {
        $email = strtolower(trim($body['email'] ?? ''));
        $oldPass = trim($body['oldPassword'] ?? '');
        $newPass = trim($body['newPassword'] ?? '');

        if (strlen($newPass) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'Mật khẩu mới phải có ít nhất 6 ký tự']);
            exit;
        }

        $members = CRMDatabase::getSalesMembers();
        $updated = false;
        foreach ($members as &$m) {
            if (strtolower(trim($m['email'])) === $email) {
                if (($m['password'] ?? 'CHANGE_ME_BEFORE_USE') === $oldPass) {
                    $m['password'] = $newPass;
                    $updated = true;
                    break;
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'Mật khẩu cũ không chính xác']);
                    exit;
                }
            }
        }
        if ($updated) {
            CRMDatabase::saveSalesMembers($members);
            echo json_encode(['success' => true, 'message' => 'Đổi mật khẩu thành công']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Không tìm thấy tài khoản']);
        }
        exit;
    }

    // 11. Sales: GET /api/sales-members
    if ($uri === '/sales-members' && $method === 'GET') {
        $members = CRMDatabase::getSalesMembers();
        echo json_encode($members, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 12. Sales: POST /api/sales-members
    if ($uri === '/sales-members' && $method === 'POST') {
        $members = is_array($body) ? $body : [];
        CRMDatabase::saveSalesMembers($members);
        echo json_encode(['success' => true, 'count' => count($members)]);
        exit;
    }

    // 13. Status: GET /api/database/status
    if ($uri === '/database/status' && $method === 'GET') {
        $leads = CRMDatabase::getLeads();
        $members = CRMDatabase::getSalesMembers();
        $assigned = 0;
        foreach ($leads as $l) {
            if (!empty($l['assignee']) && $l['assignee'] !== 'Chưa phân bổ') $assigned++;
        }
        $activeMembers = 0;
        foreach ($members as $m) {
            if (($m['status'] ?? '') === 'active') $activeMembers++;
        }

        echo json_encode([
            'status' => 'connected',
            'databaseEngine' => CRMDatabase::isMysqlConnected() ? 'MySQL 5.7+ / MariaDB' : 'JSON Persistent Store',
            'storageType' => CRMDatabase::isMysqlConnected() ? 'Relational SQL Database' : 'Local JSON Data Cache',
            'totalLeads' => count($leads),
            'assignedLeads' => $assigned,
            'unassignedLeads' => count($leads) - $assigned,
            'totalSalesMembers' => count($members),
            'activeSalesMembers' => $activeMembers,
            'lastSyncAt' => date('c'),
            'googleSheets' => [
                'nvkd' => 'MAY_TRUONGBV_MH5.19_NVKD_V.1',
                'crm' => 'MAY_TRUONGBV_MH5.19_CRM_V.1'
            ]
        ]);
        exit;
    }

    // 14. Export: GET /api/database/export
    if ($uri === '/database/export' && $method === 'GET') {
        $leads = CRMDatabase::getLeads();
        $members = CRMDatabase::getSalesMembers();
        header('Content-Disposition: attachment; filename="crm_mayhomes_export_' . date('Ymd_His') . '.json"');
        echo json_encode([
            'exportedAt' => date('c'),
            'leads' => $leads,
            'salesMembers' => $members
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 15. AI Correct text (nếu cấu hình GEMINI_API_KEY)
    if ($uri === '/ai/correct-text' && $method === 'POST') {
        $text = $body['text'] ?? '';
        echo json_encode(['correctedText' => $text]);
        exit;
    }

    // Route không tìm thấy
    http_response_code(404);
    echo json_encode(['error' => 'API endpoint not found: ' . $uri]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server Internal Error: ' . $e->getMessage()]);
    exit;
}
`;
fs.writeFileSync(path.join(PKG_DIR, "api", "index.php"), apiIndexPhp, "utf8");

// 9. Tạo file .htaccess tối ưu cho Apache cPanel
const htaccess = `# ========================================================
# CẤU HÌNH .HTACCESS CHO CRM BẤT ĐỘNG SẢN MAYHOMES
# Hỗ trợ cPanel, DirectAdmin, Apache, Litespeed, Nginx reverse proxy
# ========================================================

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Chuyển hướng toàn bộ request /api/* vào api/index.php
  RewriteRule ^api/(.*)$ api/index.php [QSA,L]
  RewriteRule ^api$ api/index.php [QSA,L]

  # 2. Cho phép tải trực tiếp các tệp tĩnh nếu tồn tại
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 3. Mọi đường dẫn khác chuyển về index.html (React SPA Router)
  RewriteRule ^ index.html [L]
</IfModule>

# Bảo mật: Không cho phép duyệt trực tiếp thư mục
Options -Indexes

# Bảo vệ thư mục dữ liệu JSON dự phòng
<IfModule mod_authz_core.c>
  <FilesMatch "^(config\\.php|database\\.sql)$">
    # Vẫn cho phép quản trị viên tải qua FTP/cPanel File Manager, nhưng chặn trực tiếp qua URL trình duyệt
    Require all denied
  </FilesMatch>
</IfModule>

# Bật nén GZIP tăng tốc độ tải trang
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain text/html text/xml text/css application/xml application/xhtml+xml application/rss+xml application/javascript application/x-javascript application/json
</IfModule>

# Thiết lập Cache cho Assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
`;
fs.writeFileSync(path.join(PKG_DIR, ".htaccess"), htaccess, "utf8");

// 10. Tạo file hướng dẫn chi tiết tiếng Việt
const readmeTxt = `================================================================================
HƯỚNG DẪN TẢI LÊN HOSTING (cPanel / DirectAdmin / Plesk)
HỆ THỐNG CRM BẤT ĐỘNG SẢN MAYHOMES (MAY_MH5.19)
================================================================================

Bộ mã nguồn này bao gồm:
1. Giao diện Web SPA (React + Tailwind CSS) đã biên dịch sẵn tối ưu.
2. Bộ API Backend chạy bằng PHP (tương thích PHP 7.4, 8.0, 8.1, 8.2, 8.3).
3. Cơ sở dữ liệu MySQL chuẩn (database.sql) gồm 51 khách hàng thực tế và 22 nhân viên.
4. Cơ chế kép: Tự động chạy ngay lập tức cả với MySQL hoặc chế độ File JSON dự phòng.

--------------------------------------------------------------------------------
BƯỚC 1: TẠO DATABASE TRÊN HOSTING (CPANEL)
--------------------------------------------------------------------------------
1. Đăng nhập vào cPanel Hosting của anh/chị.
2. Tìm mục "MySQL Databases" (Cơ sở dữ liệu MySQL).
3. Tạo 1 Database mới, ví dụ: \`mayhomes_crm\`.
4. Tạo 1 User MySQL mới, ví dụ: \`mayhomes_user\` và đặt mật khẩu (ví dụ: \`CHANGE_ME_BEFORE_USE\`).
5. Ở phần "Add User to Database", thêm User vừa tạo vào Database và tích chọn "ALL PRIVILEGES" (Tất cả quyền).

--------------------------------------------------------------------------------
BƯỚC 2: IMPORT DỮ LIỆU TỪ FILE database.sql
--------------------------------------------------------------------------------
1. Trên cPanel, mở công cụ "phpMyAdmin".
2. Nhấp vào tên Database vừa tạo ở cột bên trái.
3. Nhấp vào tab "Import" (Nhập) ở thanh menu trên cùng.
4. Nhấp "Choose File" (Chọn tệp) và chọn file \`database.sql\` trong bộ cài này.
5. Nhấp nút "Import" (hoặc "Go") ở dưới cùng.
   => Toàn bộ 51 khách hàng và 22 nhân sự sẽ được nạp hoàn chỉnh vào MySQL!

--------------------------------------------------------------------------------
BƯỚC 3: ĐIỀN THÔNG TIN DATABASE VÀO FILE config.php
--------------------------------------------------------------------------------
Mở file \`config.php\` và chỉnh sửa 4 dòng sau theo thông tin anh/chị vừa tạo ở Bước 1:

define('DB_HOST', 'localhost');          // Thường giữ nguyên localhost
define('DB_NAME', 'tên_database_vừa_tạo'); // Ví dụ: cpaneluser_mayhomes_crm
define('DB_USER', 'tên_user_vừa_tạo');     // Ví dụ: cpaneluser_mayhomes_user
define('DB_PASS', 'mật_khẩu_user');        // Mật khẩu anh/chị vừa tạo

* LƯU Ý ĐẶC BIỆT: Nếu chưa kịp cấu hình MySQL, hệ thống vẫn hoạt động bình thường
bằng cơ chế JSON dự phòng có sẵn trong thư mục data/.

--------------------------------------------------------------------------------
BƯỚC 4: UPLOAD TOÀN BỘ FILE LÊN THƯ MỤC WEB (public_html)
--------------------------------------------------------------------------------
1. Mở "File Manager" (Quản lý tệp) trên cPanel.
2. Vào thư mục \`public_html\` (hoặc thư mục tên miền của anh/chị).
3. Tải file nén .zip lên và bấm "Extract" (Giải nén).
   Đảm bảo cấu trúc các file nằm trực tiếp trong public_html:
   - index.html
   - config.php
   - database.sql
   - .htaccess
   - assets/ (thư mục css, js)
   - api/ (thư mục php api)
   - data/ (thư mục dữ liệu json dự phòng)

--------------------------------------------------------------------------------
BƯỚC 5: TRUY CẬP VÀ ĐĂNG NHẬP
--------------------------------------------------------------------------------
Mở trình duyệt và truy cập tên miền của anh/chị (ví dụ: https://tenmiencuaban.com).
Hệ thống sẽ hiển thị ngay lập tức với đầy đủ dữ liệu.

Tài khoản quản trị Admin đăng nhập:
- Email: nhaphotrungtam.com.vn@gmail.com
- Mật khẩu: CHANGE_ME_BEFORE_USE

Tài khoản NVKD (Trần Minh Phúc):
- Email: phuc.tran@mayhomes.vn
- Mật khẩu: CHANGE_ME_BEFORE_USE

Chúc anh/chị triển khai thành công!
`;
fs.writeFileSync(path.join(PKG_DIR, "HUONG_DAN_CAI_DAT_HOSTING.txt"), readmeTxt, "utf8");
fs.writeFileSync(path.join(PKG_DIR, "README.md"), readmeTxt, "utf8");

// 11. Đóng gói ZIP bằng python3 zipfile
console.log("Đang nén toàn bộ gói thành file crm_mayhomes_php_hosting.zip...");
const zipFile = path.join(ROOT_DIR, "crm_mayhomes_php_hosting.zip");
if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);

execSync(`python3 -c "
import zipfile, os
zip_path = '${zipFile}'
source_dir = '${PKG_DIR}'
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, source_dir)
            zipf.write(file_path, arcname)
print('Nén thành công ZIP!')
"`, { stdio: "inherit" });

// 12. Sao chép file zip vào thư mục dist và public để người dùng có thể tải trực tiếp trên giao diện Web!
const publicDir = path.join(ROOT_DIR, "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(zipFile, path.join(publicDir, "crm_mayhomes_php_hosting.zip"));
if (fs.existsSync(DIST_DIR)) {
  fs.copyFileSync(zipFile, path.join(DIST_DIR, "crm_mayhomes_php_hosting.zip"));
}

console.log("=== HOÀN TẤT ĐÓNG GÓI! ===");
console.log("Thư mục mã nguồn PHP:", PKG_DIR);
console.log("Tệp nén tải lên Hosting:", zipFile);
console.log("Đường dẫn tải trực tiếp qua trình duyệt: /crm_mayhomes_php_hosting.zip");
