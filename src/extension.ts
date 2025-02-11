import * as vscode from 'vscode';
import { AIService } from './services/ai-service';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI2SQL extension is now active!');

    const aiService = new AIService(AIService.getConfiguration());

    // Register the generateSQL command
    let generateSQLDisposable = vscode.commands.registerCommand('ai2sql.generateSQL', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active text editor found');
                return;
            }

            const selection = editor.selection;
            const text = editor.document.getText(selection);

            if (!text) {
                vscode.window.showErrorMessage('Please select some text to generate SQL');
                return;
            }

            // Use AI service to generate SQL
            const generatedSQL = await aiService.generateSQL(text);
            
            // Insert the generated SQL
            await editor.edit((editBuilder: vscode.TextEditorEdit) => {
                editBuilder.replace(selection, generatedSQL);
            });

            vscode.window.showInformationMessage('SQL generated successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating SQL: ${error}`);
        }
    });

    // Register the optimizeSQL command
    let optimizeSQLDisposable = vscode.commands.registerCommand('ai2sql.optimizeSQL', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active text editor found');
                return;
            }

            const selection = editor.selection;
            const sql = editor.document.getText(selection);

            if (!sql) {
                vscode.window.showErrorMessage('Please select a SQL query to optimize');
                return;
            }

            // Use AI service to optimize SQL
            const optimizedSQL = await aiService.optimizeSQL(sql);
            
            // Insert the optimized SQL
            await editor.edit((editBuilder: vscode.TextEditorEdit) => {
                editBuilder.replace(selection, optimizedSQL);
            });

            vscode.window.showInformationMessage('SQL optimized successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Error optimizing SQL: ${error}`);
        }
    });

    context.subscriptions.push(generateSQLDisposable, optimizeSQLDisposable);
}

export function deactivate() {} 