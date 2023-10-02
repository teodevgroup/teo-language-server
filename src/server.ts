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
  } from 'vscode-languageserver'
  import { createConnection, IPCMessageReader, IPCMessageWriter } from 'vscode-languageserver/node'
  import { TextDocument } from 'vscode-languageserver-textdocument'
  import { LSOptions, LSSettings } from './settings'
import { handleDiagnosticsRequest } from './wasm'
  
  function getConnection(options?: LSOptions): Connection {
    let connection = options?.connection
    if (!connection) {
      connection = process.argv.includes('--stdio')
        ? createConnection(process.stdin, process.stdout)
        : createConnection(new IPCMessageReader(process), new IPCMessageWriter(process))
    }
    return connection
  }
  
  let hasCodeActionLiteralsCapability = false
  let hasConfigurationCapability = false
  
  /**
   * Starts the language server.
   *
   * @param options Options to customize behavior
   */
  export function startServer(options?: LSOptions): void {
    // Source code: https://github.com/microsoft/vscode-languageserver-node/blob/main/server/src/common/server.ts#L1044
    const connection: Connection = getConnection(options)
  
    console.log = connection.console.log.bind(connection.console)
    console.error = connection.console.error.bind(connection.console)
  
    const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)
  
    connection.onInitialize((params: InitializeParams) => {
      // Logging first...
      connection.console.info(`Teo langauge server started`)
  
  
      // ... and then capabilities of the language server
      const capabilities = params.capabilities
  
      hasCodeActionLiteralsCapability = Boolean(capabilities?.textDocument?.codeAction?.codeActionLiteralSupport)
      hasConfigurationCapability = Boolean(capabilities?.workspace?.configuration)
  
      const result: InitializeResult = {
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
      }
  
      if (hasCodeActionLiteralsCapability) {
        result.capabilities.codeActionProvider = {
          codeActionKinds: [CodeActionKind.QuickFix],
        }
      }
  
      return result
    })
  
    connection.onInitialized(() => {
      if (hasConfigurationCapability) {
        // Register for all configuration changes.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        connection.client.register(DidChangeConfigurationNotification.type, undefined)
      }
    })
  
    // The global settings, used when the `workspace/configuration` request is not supported by the client or is not set by the user.
    // This does not apply to VS Code, as this client supports this setting.
    // const defaultSettings: LSSettings = {}
    // let globalSettings: LSSettings = defaultSettings // eslint-disable-line
  
    // Cache the settings of all open documents
    const documentSettings: Map<string, Thenable<LSSettings>> = new Map<string, Thenable<LSSettings>>()
  
    connection.onDidChangeConfiguration((_change) => {
      connection.console.info('Configuration changed.')
      if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear()
      }
  
      // Revalidate all open teo schemas
      documents.all().forEach(validateTextDocument) // eslint-disable-line @typescript-eslint/no-misused-promises
    })
  
    // Only keep settings for open documents
    documents.onDidClose((e) => {
      documentSettings.delete(e.document.uri)
    })
  
    // Note: VS Code strips newline characters from the message
    function showErrorToast(errorMessage: string): void {
      connection.window.showErrorMessage(errorMessage)
    }
  
    function validateTextDocument(textDocument: TextDocument) {
      const diagnostics: Diagnostic[] = handleDiagnosticsRequest(textDocument)
      void connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
    }
  
    documents.onDidChangeContent((change: { document: TextDocument }) => {
      validateTextDocument(change.document)
    })
  
    function getDocument(uri: string): TextDocument | undefined {
      return documents.get(uri)
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
      connection.console.log(`Types have changed. Sending request to restart TS Language Server.`)
      // Restart TS Language Server
      void connection.sendNotification('teo/didChangeWatchedFiles', {})
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