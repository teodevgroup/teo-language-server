import {
    TextDocuments,
    Diagnostic,
    InitializeParams,
    InitializeResult,
    CodeActionKind,
    CodeActionParams,
    HoverParams,
    CompletionItem,
    CompletionParams,
    DeclarationParams,
    RenameParams,
    DocumentFormattingParams,
    DidChangeConfigurationNotification,
    Connection,
    DocumentSymbolParams,
    ProposedFeatures,
    TextDocumentSyncKind,
    LocationLink,
    Range,
} from 'vscode-languageserver'
import { createConnection, IPCMessageReader, IPCMessageWriter } from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { findDefinitionsAtPosition, removeCachedSchema, validateTextDocument } from './wasm'
import { sanitizeUri } from './utils'

/**
* Starts the language server.
*
* @param options Options to customize behavior
*/
export function startServer(): void {
    // Create a connection for the server, using Node's IPC as a transport.
    // Also include all preview / proposed LSP features.
    const connection = createConnection(ProposedFeatures.all)

    // Create a simple text document manager.
    const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

    connection.onInitialize((params: InitializeParams) => {
        // Logging first...
        connection.console.info(`Teo langauge server started`)
        const result: InitializeResult = {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Full,
                definitionProvider: true,
                //documentFormattingProvider: true,
                //completionProvider: {
                //    resolveProvider: true,
                //    triggerCharacters: ['@', '"', '.'],
                //},
                //hoverProvider: true,
                //renameProvider: true,
                //documentSymbolProvider: true,
                workspace: {
                    workspaceFolders: {
                        supported: true
                    }
                }
            },
        }
        return result;
    });
    
    connection.onInitialized(() => {
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    });

    connection.onDidChangeConfiguration((_change) => {
        connection.console.info('Configuration changed.')
        
        // Revalidate all open teo schemas
        documents.all().forEach(validateTextDocumentAndSendDiagnostics, documents) // eslint-disable-line @typescript-eslint/no-misused-promises
    })
    
    // Remove cached schema from WASM
    documents.onDidClose((e) => {
        removeCachedSchema(sanitizeUri(e.document.uri))
    })

    documents.onDidChangeContent((change: { document: TextDocument }) => {
        validateTextDocumentAndSendDiagnostics(change.document)
    })

    function validateTextDocumentAndSendDiagnostics(textDocument: TextDocument) {
        const diagnostics: Diagnostic[] = validateTextDocument(textDocument, documents.all())
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
    }
    
    // Note: VS Code strips newline characters from the message
    function showErrorToast(errorMessage: string): void {
        connection.window.showErrorMessage(errorMessage)
    }
    
    connection.onDefinition((params: DeclarationParams) => {
        return findDefinitionsAtPosition(params.textDocument.uri, documents.all(), params.position)
    })
    
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
    

    connection.onDidChangeWatchedFiles(() => {

    })
    
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
    documents.listen(connection)
    
    connection.listen()
}