"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const wasm_1 = require("./wasm");
const utils_1 = require("./utils");
/**
* Starts the language server.
*
* @param options Options to customize behavior
*/
function startServer() {
    // Create a connection for the server, using Node's IPC as a transport.
    // Also include all preview / proposed LSP features.
    const connection = (0, node_1.createConnection)(vscode_languageserver_1.ProposedFeatures.all);
    // Create a simple text document manager.
    const documents = new vscode_languageserver_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
    connection.onInitialize((params) => {
        // Logging first...
        connection.console.info(`Teo langauge server started`);
        const result = {
            capabilities: {
                textDocumentSync: vscode_languageserver_1.TextDocumentSyncKind.Full,
                definitionProvider: true,
                completionProvider: {
                    resolveProvider: true,
                    triggerCharacters: ['@', '"', '.'],
                },
                //documentFormattingProvider: true,
                //hoverProvider: true,
                //renameProvider: true,
                //documentSymbolProvider: true,
                workspace: {
                    workspaceFolders: {
                        supported: true
                    }
                }
            },
        };
        return result;
    });
    connection.onInitialized(() => {
        connection.client.register(vscode_languageserver_1.DidChangeConfigurationNotification.type, undefined);
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    });
    connection.onDidChangeConfiguration((_change) => {
        connection.console.info('Configuration changed.');
        // Revalidate all open teo schemas
        documents.all().forEach(validateTextDocumentAndSendDiagnostics, documents); // eslint-disable-line @typescript-eslint/no-misused-promises
    });
    // Remove cached schema from WASM
    documents.onDidClose((e) => {
        (0, wasm_1.removeCachedSchema)((0, utils_1.sanitizeUri)(e.document.uri));
    });
    documents.onDidChangeContent((change) => {
        validateTextDocumentAndSendDiagnostics(change.document);
    });
    function validateTextDocumentAndSendDiagnostics(textDocument) {
        const diagnostics = (0, wasm_1.validateTextDocument)(textDocument, documents.all());
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    }
    // Note: VS Code strips newline characters from the message
    function showErrorToast(errorMessage) {
        connection.window.showErrorMessage(errorMessage);
    }
    connection.onDefinition((params) => {
        return (0, wasm_1.findDefinitionsAtPosition)(params.textDocument.uri, params.position);
    });
    connection.onCompletion((params) => {
        return (0, wasm_1.completionItemsAtPosition)(params.textDocument.uri, params.position, documents.all());
    });
    connection.onCompletionResolve((completionItem) => {
        return completionItem;
    });
    connection.onDidChangeWatchedFiles(() => {
    });
    // connection.onHover((params: HoverParams) => {
    //   const doc = getDocument(params.textDocument.uri)
    //   if (doc) {
    //     return MessageHandler.handleHoverRequest(doc, params)
    //   }
    // })
    // connection.onDocumentFormatting((params: DocumentFormattingParams) => {
    //   const doc = getDocument(params.textDocument.uri)
    //   if (doc) {
    //     return MessageHandler.handleDocumentFormatting(params, doc, showErrorToast)
    //   }
    // })
    // connection.onCodeAction((params: CodeActionParams) => {
    //   const doc = getDocument(params.textDocument.uri)
    //   if (doc) {
    //     return MessageHandler.handleCodeActions(params, doc, showErrorToast)
    //   }
    // })
    // connection.onRenameRequest((params: RenameParams) => {
    //   const doc = getDocument(params.textDocument.uri)
    //   if (doc) {
    //     return MessageHandler.handleRenameRequest(params, doc)
    //   }
    // })
    // connection.onDocumentSymbol((params: DocumentSymbolParams) => {
    //   const doc = getDocument(params.textDocument.uri)
    //   if (doc) {
    //     return MessageHandler.handleDocumentSymbol(params, doc)
    //   }
    // })
    // Make the text document manager listen on the connection
    // for open, change and close text document events
    documents.listen(connection);
    connection.listen();
}
exports.startServer = startServer;
//# sourceMappingURL=server.js.map