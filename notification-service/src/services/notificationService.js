const axios = require('axios');
const Notification = require('../models/Notification');
const { sendEmail } = require('./emailService');

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8080';

// ─── Company Member Email Builder ────────────────────────────────────────────────
const buildCompanyEmailHtml = ({ eventType, companyName, userFullName, newRole }) => {
    let headline, subheadline, icon, color;
    
    if (eventType === 'MEMBER_ADDED') {
        headline = 'Welcome to the Team!';
        subheadline = `You have been added to ${companyName} as a ${newRole}.`;
        icon = '👋';
        color = '#4CAF50';
    } else if (eventType === 'MEMBER_REMOVED') {
        headline = 'Membership Revoked';
        subheadline = `You have been removed from ${companyName}.`;
        icon = '🚪';
        color = '#e53935';
    } else if (eventType === 'ROLE_CHANGED') {
        headline = 'Role Updated';
        subheadline = `Your role in ${companyName} has been changed to ${newRole}.`;
        icon = '🔄';
        color = '#2196F3';
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#1a1a2e;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);background:#16213e;">
        <tr>
          <td style="padding:40px 28px;text-align:center;">
             <p style="margin:0 0 12px;font-size:42px;">${icon}</p>
             <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:${color};">${headline}</h1>
             <p style="margin:0 0 24px;font-size:16px;color:#e0e0e0;line-height:1.6;">
               Hello ${userFullName},<br/><br/>
               ${subheadline}
             </p>
             <p style="margin:0;font-size:14px;color:#8899aa;line-height:1.6;">
               Log in to the dashboard to view your current company access.
             </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// ─── HTML Email Builder ────────────────────────────────────────────────────────
const buildEmailHtml = ({ type, categoryName, budgetName, alertThreshold, spentPercentage, allocatedAmount, totalSpent }) => {
    const remaining = allocatedAmount - totalSpent;
    const isExceeded = type === 'EXCEED_ALERT';

    const headerBg = isExceeded
        ? 'linear-gradient(135deg, #e53935 0%, #b71c1c 100%)'
        : 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)';

    const icon        = isExceeded ? '🚨' : '⚠️';
    const headline    = isExceeded ? 'Budget Exceeded!' : 'Budget Alert';
    const subheadline = isExceeded ? 'You have gone over your allocated budget' : 'Spending threshold reached';

    const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
    const pct = (n) => `${Number(n).toFixed(0)}%`;

    const remainingColor = remaining >= 0 ? '#4CAF50' : '#e53935';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#1a1a2e;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);">

        <!-- HEADER -->
        <tr>
          <td style="background:${headerBg};padding:32px 28px;text-align:center;">
            <p style="margin:0 0 8px;font-size:28px;">${icon}</p>
            <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${headline}</h1>
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">${subheadline}</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#16213e;padding:28px;">

            <!-- Intro text -->
            <p style="margin:0 0 22px;font-size:15px;color:#e0e0e0;line-height:1.7;">
              The category <strong style="color:#FF9800;">${categoryName}</strong> in budget
              <strong style="color:#fff;">"${budgetName || 'Your Budget'}"</strong> has reached
              <strong style="color:${isExceeded ? '#e53935' : '#FF9800'};">${pct(spentPercentage)}</strong>
              of its allocated amount.
            </p>

            <!-- Stats Table -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#0f3460;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.07);">
                  <span style="color:#FF9800;font-size:13px;font-weight:600;">Alert Threshold</span>
                </td>
                <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:right;">
                  <span style="color:#FF9800;font-size:14px;font-weight:700;">${pct(alertThreshold)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.07);">
                  <span style="color:#FF9800;font-size:13px;font-weight:600;">Current Usage</span>
                </td>
                <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:right;">
                  <span style="color:${isExceeded ? '#e53935' : '#FF9800'};font-size:14px;font-weight:700;">${pct(spentPercentage)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.07);">
                  <span style="color:#FF9800;font-size:13px;font-weight:600;">Allocated Amount</span>
                </td>
                <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:right;">
                  <span style="color:#FF9800;font-size:14px;font-weight:700;">${fmt(allocatedAmount)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.07);">
                  <span style="color:#FF9800;font-size:13px;font-weight:600;">Total Spent</span>
                </td>
                <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.07);text-align:right;">
                  <span style="color:#FF9800;font-size:14px;font-weight:700;">${fmt(totalSpent)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 18px;">
                  <span style="color:#FF9800;font-size:13px;font-weight:600;">Remaining</span>
                </td>
                <td style="padding:14px 18px;text-align:right;">
                  <span style="color:${remainingColor};font-size:14px;font-weight:700;">${fmt(remaining)}</span>
                </td>
              </tr>
            </table>

            <!-- Footer note -->
            <p style="margin:22px 0 0;font-size:12px;color:#8899aa;line-height:1.6;text-align:center;">
              Please review your spending and consider adjusting your budget allocation if needed.
            </p>

          </td>
        </tr>

        <!-- FOOTER BAR -->
        <tr>
          <td style="background:#0d1b2e;padding:14px 28px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#556677;">
              © ${new Date().getFullYear()} Artha &nbsp;|&nbsp; Automated Budget Notification
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// ─── Notification Service ──────────────────────────────────────────────────────
class NotificationService {

    async handleExpenseEvent(expenseEvent) {
        try {
            console.log('Processing expense event:', expenseEvent);
            const { companyId, budgetId, allocationId, status } = expenseEvent;

            if (status !== 'APPROVED') {
                console.log('Expense is not APPROVED, skipping.');
                return;
            }

            // 1. Fetch company members
            const membersUrl = `${API_GATEWAY_URL}/internal/user/api/companies/${companyId}/members`;
            const membersResponse = await axios.get(membersUrl);
            const members = membersResponse.data;
            const owner = members.find(m => m.role === 'OWNER');

            if (!owner) {
                console.error('No owner found for company:', companyId);
                return;
            }

            const ownerId    = owner.userId;
            const ownerEmail = owner.email;

            // 2. Fetch budget details
            const budgetUrl = `${API_GATEWAY_URL}/internal/budget/api/budgets/${budgetId}/details`;
            const budgetResponse = await axios.get(budgetUrl, {
                headers: { 'X-User-Id': ownerId }
            });
            const budget = budgetResponse.data;

            const allocation = budget.allocations.find(a => a.id === allocationId);
            if (!allocation) {
                console.error('Allocation not found in budget:', allocationId);
                return;
            }

            const allocatedAmount = parseFloat(allocation.allocatedAmount);
            const alertThreshold  = allocation.alertThreshold || 80;

            // 3. Fetch all expenses for this allocation
            const expensesUrl = `${API_GATEWAY_URL}/internal/expense/api/expenses/allocation/${allocationId}`;
            const expensesResponse = await axios.get(expensesUrl, {
                headers: { 'X-User-Id': ownerId }
            });
            const expenses = expensesResponse.data;

            const totalSpent = expenses
                .filter(e => e.status === 'APPROVED')
                .reduce((sum, e) => sum + parseFloat(e.amount), 0);

            const spentPercentage = (totalSpent / allocatedAmount) * 100;

            console.log(`Allocation: ${allocation.categoryName}, Allocated: ${allocatedAmount}, Total Spent: ${totalSpent}, Threshold: ${alertThreshold}%`);

            // 4. Check alerts
            if (spentPercentage >= 100) {
                await this.triggerAlert('EXCEED_ALERT', ownerId, ownerEmail, companyId, budgetId, allocationId, allocation.categoryName, budget.name, allocatedAmount, totalSpent, alertThreshold, spentPercentage);
            } else if (spentPercentage >= alertThreshold) {
                await this.triggerAlert('THRESHOLD_ALERT', ownerId, ownerEmail, companyId, budgetId, allocationId, allocation.categoryName, budget.name, allocatedAmount, totalSpent, alertThreshold, spentPercentage);
            }

        } catch (error) {
            console.error('Error handling expense event:', error.message);
            if (error.response) {
                console.error('Axios Error Response Data:', JSON.stringify(error.response.data));
                console.error('Axios Error Status:', error.response.status);
                console.error('Axios Error URL:', error.config.url);
            }
        }
    }

    async triggerAlert(type, userId, email, companyId, budgetId, allocationId, categoryName, budgetName, allocatedAmount, totalSpent, alertThreshold, spentPercentage) {
        try {
            // Deduplicate — don't send same alert twice
            const existingAlert = await Notification.findOne({ allocationId, type });
            if (existingAlert) {
                console.log(`Alert ${type} already sent for allocation ${allocationId}`);
                return;
            }

            const isExceeded = type === 'EXCEED_ALERT';
            const subject = isExceeded
                ? `🚨 Artha Alert: Budget Exceeded — ${categoryName}`
                : `⚠️ Artha Alert: Threshold Reached — ${categoryName}`;

            const html = buildEmailHtml({ type, categoryName, budgetName, alertThreshold, spentPercentage, allocatedAmount, totalSpent });

            await sendEmail(email, subject, null, html);

            const newNotification = new Notification({ userId, companyId, budgetId, allocationId, type });
            await newNotification.save();

            console.log(`Successfully sent ${type} email to ${email} for allocation ${allocationId}`);

        } catch (error) {
            if (error.code === 11000) {
                console.log(`Alert ${type} concurrently sent for allocation ${allocationId}`);
            } else {
                console.error('Error triggering alert:', error);
            }
        }
    }

    async handleCompanyEvent(companyEvent) {
        try {
            console.log('Processing company event:', companyEvent);
            const { eventType, companyId, companyName, targetUserId, targetUserEmail, targetUserFullName, newRole } = companyEvent;

            let subject = 'Artha Update';
            if (eventType === 'MEMBER_ADDED') subject = `You've been added to ${companyName}`;
            else if (eventType === 'MEMBER_REMOVED') subject = `Update regarding ${companyName}`;
            else if (eventType === 'ROLE_CHANGED') subject = `Role updated in ${companyName}`;

            const html = buildCompanyEmailHtml({
                eventType,
                companyName,
                userFullName: targetUserFullName,
                newRole
            });

            await sendEmail(targetUserEmail, subject, null, html);
            console.log(`Successfully sent ${eventType} email to ${targetUserEmail}`);

        } catch (error) {
            console.error('Error handling company event:', error.message);
        }
    }
}

module.exports = new NotificationService();


