// @ts-nocheck
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('ViziAudit Extension is now active!');
    
    let disposable = vscode.commands.registerCommand('viziaudit.auditFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }
        const fileName = editor.document.fileName;
        const fileText = editor.document.getText();
        let apiData: any = null;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "ViziAudit Engine: Connecting to Cloud AI...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 10, message: "Parsing React Tokens..." });
            try {
                // 🔥 THE PERMANENT FIX: Standard dynamic fetch request with safety headers
                const response = await fetch('https://ai-auditor-vizi.vercel.app/api/audit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        sourceCode: fileText
                    })
                });
                
                if (response.ok) {
                    apiData = await response.json();
                } else {
                    const errorText = await response.text();
                    console.error("Backend server rejected request:", errorText);
                    vscode.window.showWarningMessage('Backend returned an error state.');
                }
            } catch (error) {
                console.error("Connection failed completely:", error);
                // Fallback: Agar local network string strict ho, toh 127.0.0.1 try karein automatically
                try {
                    const fallbackRes = await fetch('https://ai-auditor-vizi.vercel.app/api/audit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sourceCode: fileText })
                    });
                    if (fallbackRes.ok) {
                        apiData = await fallbackRes.json();
                    } else {
                        vscode.window.showErrorMessage('Backend engine error.');
                    }
                } catch (fallbackErr) {
                    vscode.window.showErrorMessage('Failed to connect to Localhost Backend Engine.');
                }
            }
        });

        // Humesha panel load hoga, chahe data aaye ya crash ho, taake UI freeze na ho
        const panel = vscode.window.createWebviewPanel(
            'viziAuditReport',
            'ViziAudit Engine Report',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                enableCommandUris: true,
                localResourceRoots: [
                    vscode.Uri.file(context.extensionPath)
                ],
                retainContextWhenHidden: true
            }
        );
        
        panel.webview.html = getWebviewContent(fileName, apiData);

        // 🛠️ RELIABLE MESSAGE RECEIVER FOR APPLYING FIXED TOKENS
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'applyFix') {
                let activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor && vscode.window.visibleTextEditors.length > 0) {
                    activeEditor = vscode.window.visibleTextEditors[0];
                }

                if (!activeEditor) {
                    vscode.window.showErrorMessage('ViziAudit: Please click inside your code file editor window first.');
                    return;
                }

                try {
                    const text = activeEditor.document.getText();
                    const oldCode = Buffer.from(message.oldCode, 'base64').toString('utf-8').trim();
                    const fixedCode = Buffer.from(message.fixedCode, 'base64').toString('utf-8');

                    let targetRange: vscode.Range | null = null;

                    if (text.includes(oldCode)) {
                        const startIndex = text.indexOf(oldCode);
                        const startPos = activeEditor.document.positionAt(startIndex);
                        const endPos = activeEditor.document.positionAt(startIndex + oldCode.length);
                        targetRange = new vscode.Range(startPos, endPos);
                    } else {
                        const lines = text.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            const cleanLine = lines[i].trim();
                            if (cleanLine.length > 0 && (lines[i].includes(oldCode) || oldCode.includes(cleanLine))) {
                                targetRange = new vscode.Range(
                                    new vscode.Position(i, 0),
                                    new vscode.Position(i, lines[i].length)
                                );
                                break;
                            }
                        }
                    }

                    if (targetRange) {
                        await activeEditor.edit((editBuilder) => {
                            editBuilder.replace(targetRange!, fixedCode);
                        });
                        vscode.window.showInformationMessage('🎉 ViziAudit: Code fixed automatically via AI!');
                    } else {
                        vscode.window.showErrorMessage('ViziAudit Check: Target block matching failed.');
                    }
                } catch (err) {
                    vscode.window.showErrorMessage('Internal replacement crash: ' + err.message);
                }
            }
        }, undefined, context.subscriptions);
    });
    context.subscriptions.push(disposable);
}

function getWebviewContent(fileName: string, apiData: any): string {
    const cleanFileName = fileName.split('\\').pop() || fileName;
    const reportIssues = apiData?.issues || [];
    
    const criticalCount = reportIssues.filter((i: any) => {
        const sev = i.severity?.toLowerCase();
        return sev === 'high' || sev === 'critical';
    }).length;

    const warningCount = reportIssues.filter((i: any) => {
        const sev = i.severity?.toLowerCase();
        return sev === 'medium' || sev === 'warning';
    }).length;

    const suggestionCount = reportIssues.filter((i: any) => {
        const sev = i.severity?.toLowerCase();
        return sev === 'low' || sev === 'suggestion';
    }).length;
    
    const issuesHtml = reportIssues.length > 0
        ? reportIssues.map((issue: any, index: number) => {
            let severityClass = 'suggestion';
            const currentSev = issue.severity?.toLowerCase();
            if (currentSev === 'high' || currentSev === 'critical') severityClass = 'critical';
            if (currentSev === 'medium' || currentSev === 'warning') severityClass = 'warning';
            
            const base64OldCode = Buffer.from(issue.oldCode || '').toString('base64');
            const base64FixedCode = Buffer.from(issue.fixedCode || '').toString('base64');

            return `
            <div class="issue-card ${severityClass}">
                <span class="badge ${severityClass}">${issue.severity?.toUpperCase() || 'INFO'}</span>
                <h3>${index + 1}. [${issue.type || 'UI'}] Target: ${issue.element || 'Component'}</h3>
                <p>${issue.description || 'No analytical trace mapped.'}</p>
                ${issue.fixSuggestion ? `<div class="fix-box">Suggested Fix: ${issue.fixSuggestion}</div>` : ''}
                
                <button class="fix-btn" onclick="triggerFix('${base64OldCode}', '${base64FixedCode}')">
                     ⚡ Apply AI Fix
                </button>
            </div>`;
        }).join('')
        : `<div style="text-align:center; padding: 40px; color: var(--text-muted);">🎉 No anomalies detected!</div>`;

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self'https://ai-auditor-vizi.vercel.app/api/audit; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
        <style>
            :root { --bg-main: #0d0e12; --bg-card: #16181d; --accent-cyan: #00ca9a; --border-color: #242930; --text-muted: #8b949e; --critical: #ff5555; --warning: #ffb86c; --info: #8be9fd; }
            body { font-family: sans-serif; padding: 24px; color: #c9d1d9; background-color: var(--bg-main); margin: 0; }
            .header-container { border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 24px; }
            h2 { margin: 0; color: var(--accent-cyan); font-size: 22px; }
            .metrics-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
            .metric-card { background: var(--bg-card); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; text-align: center; }
            .issue-card { background: var(--bg-card); padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--border-color); position: relative; }
            .issue-card.critical { border-left: 4px solid var(--critical); }
            .issue-card.warning { border-left: 4px solid var(--warning); }
            .issue-card.suggestion { border-left: 4px solid var(--info); }
            h3 { margin: 0 0 8px 0; font-size: 15px; color: #ffffff; }
            p { font-size: 13px; color: #b3b9c1; margin: 0 0 12px 0; }
            .badge { position: absolute; top: 16px; right: 16px; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .badge.critical { background: rgba(255,85,85,0.1); color: var(--critical); border: 1px solid var(--critical); }
            .badge.warning { background: rgba(255,184,108,0.1); color: var(--warning); border: 1px solid var(--warning); }
            .badge.suggestion { background: rgba(139,233,253,0.1); color: var(--info); border: 1px solid var(--info); }
            .fix-box { background: #090a0d; border: 1px dashed #343942; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; color: var(--accent-cyan); margin-bottom: 12px; }
            .fix-btn { background: #00ca9a; color: #0d0e12; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px; }
            .fix-btn:hover { background: #00b388; }
        </style>
    </head>
    <body>
        <div class="header-container">
            <h2>🔍 ViziAudit Token Analysis Engine</h2>
            <div style="color: var(--text-muted); font-size:13px; margin-top:6px;">Target: <code>${cleanFileName}</code></div>
        </div>
        <div class="metrics-grid">
            <div class="metric-card"><h4 style="color:var(--critical); margin:0;">Critical</h4><p style="font-size:20px; font-weight:bold; margin:6px 0 0 0; color:var(--critical)">${criticalCount}</p></div>
            <div class="metric-card"><h4 style="color:var(--warning); margin:0;">Warnings</h4><p style="font-size:20px; font-weight:bold; margin:6px 0 0 0; color:var(--warning)">${warningCount}</p></div>
            <div class="metric-card"><h4 style="color:var(--info); margin:0;">Suggestions</h4><p style="font-size:20px; font-weight:bold; margin:6px 0 0 0; color:var(--info)">${suggestionCount}</p></div>
        </div>
        <div class="issues-container">${issuesHtml}</div>

        <script>
            const vscode = acquireVsCodeApi();
            function triggerFix(base64Old, base64Fixed) {
                vscode.postMessage({
                    command: 'applyFix',
                    oldCode: base64Old,
                    fixedCode: base64Fixed
                });
            }
        </script>
    </body>
    </html>`;
}
