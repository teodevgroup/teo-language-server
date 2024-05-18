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
    TextEdit,
} from 'vscode-languageserver'
import { createConnection, IPCMessageReader, IPCMessageWriter } from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { completionItemsAtPosition, findDefinitionsAtPosition, removeCachedSchema, validateTextDocument, formatDocument } from './wasm'
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
                completionProvider: {
                   resolveProvider: true,
                   triggerCharacters: ['@', '"', '.', '$', ':'],
                },
                documentFormattingProvider: false,
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

    // connection.onDocumentFormatting((params: DocumentFormattingParams) => {
    //     const doc = documents.get(params.textDocument.uri)
    //     if (doc) {
    //         return [TextEdit.replace(Range.create(0, 0, 999999, 999999), formatDocument(sanitizeUri(params.textDocument.uri), documents.all()))]
    //     }
    // })

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
        return findDefinitionsAtPosition(params.textDocument.uri, params.position)
    })
    
    connection.onCompletion((params: CompletionParams) => {
        return completionItemsAtPosition(params.textDocument.uri, params.position, documents.all())
    })
    
    connection.onCompletionResolve((completionItem: CompletionItem) => {
        return completionItem
    })
    

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