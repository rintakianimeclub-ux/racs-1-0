<?php
/**
 * Plugin Name: Rintaki App Sync
 * Description: Exposes MyCred points, Anime Cash, and PMPro membership level to the Rintaki mobile app, and accepts adjustments. Secured with a shared secret.
 * Version:     1.1.0
 * Author:      Rintaki Anime Club Society
 */

if (!defined('ABSPATH')) { exit; }

/**
 * IMPORTANT: Replace this secret with the one your app is configured with,
 * or keep it as-is since we set it for you already.
 * Never expose this key publicly.
 */
define('RINTAKI_APP_SECRET', 'Pjf3h_9gbXBaoZdIfojkrWmvuwfc9vMF9-E6NEmGT5s');

/** MyCred point-type slugs (must match MyCred → Points → Point Types). */
define('RINTAKI_POINTS_TYPE', 'mycred_default');
define('RINTAKI_CASH_TYPE',   'anime_cash');

/** Permission callback — checks the X-Rintaki-Key header. */
function rintaki_app_check_key(WP_REST_Request $req) {
    $provided = (string) $req->get_header('x-rintaki-key');
    if (empty($provided)) { return false; }
    return hash_equals(RINTAKI_APP_SECRET, $provided);
}

/** Helper: get a MyCred balance, gracefully returning 0 if MyCred isn't active. */
function rintaki_app_balance($user_id, $type) {
    if (function_exists('mycred_get_users_balance')) {
        return (float) mycred_get_users_balance($user_id, $type);
    }
    return 0.0;
}

/** Helper: return user's active PMPro membership level or {level:0} if none. */
function rintaki_app_membership($user_id) {
    if (function_exists('pmpro_getMembershipLevelForUser')) {
        $lvl = pmpro_getMembershipLevelForUser($user_id);
        if ($lvl && !empty($lvl->ID)) {
            return [
                'level' => (int) $lvl->ID,
                'name'  => isset($lvl->name) ? (string) $lvl->name : '',
            ];
        }
    }
    return ['level' => 0, 'name' => ''];
}

add_action('rest_api_init', function () {

    // GET /wp-json/rintaki/v1/balance?email=foo@bar.com
    register_rest_route('rintaki/v1', '/balance', [
        'methods'             => 'GET',
        'permission_callback' => 'rintaki_app_check_key',
        'callback'            => function (WP_REST_Request $req) {
            $email = sanitize_email((string) $req->get_param('email'));
            if (empty($email)) {
                return new WP_Error('bad_request', 'email is required', ['status' => 400]);
            }
            $user = get_user_by('email', $email);
            if (!$user) {
                return new WP_REST_Response(['found' => false], 200);
            }
            $membership = rintaki_app_membership($user->ID);
            return new WP_REST_Response([
                'found'            => true,
                'user_id'          => (int) $user->ID,
                'email'            => $user->user_email,
                'display_name'     => $user->display_name,
                'points'           => (int) rintaki_app_balance($user->ID, RINTAKI_POINTS_TYPE),
                'anime_cash'       => (int) rintaki_app_balance($user->ID, RINTAKI_CASH_TYPE),
                'membership_level' => (int) $membership['level'],
                'membership_name'  => (string) $membership['name'],
            ], 200);
        },
    ]);

    // POST /wp-json/rintaki/v1/adjust
    //   body: { email, type: "mycred_default"|"anime_cash", amount: int, reason?: string }
    register_rest_route('rintaki/v1', '/adjust', [
        'methods'             => 'POST',
        'permission_callback' => 'rintaki_app_check_key',
        'callback'            => function (WP_REST_Request $req) {
            $email  = sanitize_email((string) $req->get_param('email'));
            $type   = (string) $req->get_param('type');
            $amount = (int)    $req->get_param('amount');
            $reason = sanitize_text_field((string) ($req->get_param('reason') ?: 'Rintaki app activity'));

            if (empty($email))  { return new WP_Error('bad_request', 'email is required', ['status' => 400]); }
            if ($amount === 0)  { return new WP_REST_Response(['ok' => true, 'skipped' => true], 200); }
            if (!in_array($type, [RINTAKI_POINTS_TYPE, RINTAKI_CASH_TYPE], true)) {
                return new WP_Error('bad_type', 'Unknown type', ['status' => 400]);
            }
            if (!function_exists('mycred_add')) {
                return new WP_Error('no_mycred', 'MyCred is not installed / active', ['status' => 500]);
            }
            $user = get_user_by('email', $email);
            if (!$user) { return new WP_Error('not_found', 'User not found on WordPress', ['status' => 404]); }

            mycred_add('rintaki_app', (int) $user->ID, $amount, $reason, 0, [], $type);
            $new_balance = (int) rintaki_app_balance($user->ID, $type);
            return new WP_REST_Response(['ok' => true, 'new_balance' => $new_balance], 200);
        },
    ]);

    // GET /wp-json/rintaki/v1/ping — quick health check
    register_rest_route('rintaki/v1', '/ping', [
        'methods'             => 'GET',
        'permission_callback' => 'rintaki_app_check_key',
        'callback'            => function () {
            return [
                'ok'            => true,
                'mycred_active' => function_exists('mycred_get_users_balance'),
                'pmpro_active'  => function_exists('pmpro_getMembershipLevelForUser'),
                'points_type'   => RINTAKI_POINTS_TYPE,
                'cash_type'     => RINTAKI_CASH_TYPE,
            ];
        },
    ]);
});
