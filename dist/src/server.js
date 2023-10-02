"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const wasm_1 = require("./wasm");
function getConnection(options) {
    let connection = options === null || options === void 0 ? void 0 : options.connection;
    if (!connection) {
        connection = process.argv.includes('--stdio')
            ? (0, node_1.createConnection)(process.stdin, process.stdout)
            : (0, node_1.createConnection)(new node_1.IPCMessageReader(process), new node_1.IPCMessageWriter(process));
    }
    return connection;
}
let hasCodeActionLiteralsCapability = false;
let hasConfigurationCapability = false;
/**
 * Starts the language server.
 *
 * @param options Options to customize behavior
 */
function startServer(options) {
    // Source code: https://github.com/microsoft/vscode-languageserver-node/blob/main/server/src/common/server.ts#L1044
    const connection = getConnection(options);
    console.log = connection.console.log.bind(connection.console);
    console.error = connection.console.error.bind(connection.console);
    const documents = new vscode_languageserver_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
    connection.onInitialize((params) => {
        var _a, _b, _c;
        // Logging first...
        connection.console.info(`Teo langauge server started`);
        // ... and then capabilities of the language server
        const capabilities = params.capabilities;
        hasCodeActionLiteralsCapability = Boolean((_b = (_a = capabilities === null || capabilities === void 0 ? void 0 : capabilities.textDocument) === null || _a === void 0 ? void 0 : _a.codeAction) === null || _b === void 0 ? void 0 : _b.codeActionLiteralSupport);
        hasConfigurationCapability = Boolean((_c = capabilities === null || capabilities === void 0 ? void 0 : capabilities.workspace) === null || _c === void 0 ? void 0 : _c.configuration);
        const result = {
            capabilities: {
                definitionProvider: true,
                documentFormattingProvider: true,
                completionProvider: {
                    resolveProvider: true,
                    triggerCharacters: ['@', '"', '.'],
                },
                hoverProvider: true,
                renameProvider: true,
                documentSymbolProvider: true,
            },
        };
        if (hasCodeActionLiteralsCapability) {
            result.capabilities.codeActionProvider = {
                codeActionKinds: [vscode_languageserver_1.CodeActionKind.QuickFix],
            };
        }
        return result;
    });
    connection.onInitialized(() => {
        if (hasConfigurationCapability) {
            // Register for all configuration changes.
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            connection.client.register(vscode_languageserver_1.DidChangeConfigurationNotification.type, undefined);
        }
    });
    // The global settings, used when the `workspace/configuration` request is not supported by the client or is not set by the user.
    // This does not apply to VS Code, as this client supports this setting.
    // const defaultSettings: LSSettings = {}
    // let globalSettings: LSSettings = defaultSettings // eslint-disable-line
    // Cache the settings of all open documents
    const documentSettings = new Map();
    connection.onDidChangeConfiguration((_change) => {
        connection.console.info('Configuration changed.');
        if (hasConfigurationCapability) {
            // Reset all cached document settings
            documentSettings.clear();
        }
        // Revalidate all open teo schemas
        documents.all().forEach(validateTextDocument); // eslint-disable-line @typescript-eslint/no-misused-promises
    });
    // Only keep settings for open documents
    documents.onDidClose((e) => {
        documentSettings.delete(e.document.uri);
    });
    // Note: VS Code strips newline characters from the message
    function showErrorToast(errorMessage) {
        connection.window.showErrorMessage(errorMessage);
    }
    function validateTextDocument(textDocument) {
        const diagnostics = (0, wasm_1.handleDiagnosticsRequest)(textDocument);
        void connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    }
    documents.onDidChangeContent((change) => {
        validateTextDocument(change.document);
    });
    function getDocument(uri) {
        return documents.get(uri);
    }
    // connection.onDefinition((params: DeclarationParams) => {
    //   const doc = getDocument(params.textDocument.uri)
    //   if (doc) {
    //     return MessageHandler.handleDefinitionRequest(doc, params)
    //   }
    // })
    // connection.onCompletion((params: CompletionParams) => {
    //   const doc = getDocument(params.textDocument.uri)
    //   if (doc) {
    //     return MessageHandler.handleCompletionRequest(params, doc, showErrorToast)
    //   }
    // })
    // // This handler resolves additional information for the item selected in the completion list.
    // connection.onCompletionResolve((completionItem: CompletionItem) => {
    //   return MessageHandler.handleCompletionResolveRequest(completionItem)
    // })
    // Unused now
    // TODO remove or experiment new file watcher
    connection.onDidChangeWatchedFiles(() => {
        // Monitored files have changed in VS Code
        connection.console.log(`Types have changed. Sending request to restart TS Language Server.`);
        // Restart TS Language Server
        void connection.sendNotification('teo/didChangeWatchedFiles', {});
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