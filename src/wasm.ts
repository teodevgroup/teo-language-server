import { lint, find_definitions, remove_cached_schema, completion_items, format_document } from '@teodevgroup/teo-language-server-wasm'
import {
    DocumentFormattingParams,
    TextEdit,
    Range,
    DeclarationParams,
    CompletionParams,
    CompletionList,
    CompletionItem,
    HoverParams,
    Hover,
    CodeActionParams,
    CodeAction,
    Diagnostic,
    DiagnosticSeverity,
    RenameParams,
    WorkspaceEdit,
    CompletionTriggerKind,
    DocumentSymbolParams,
    DocumentSymbol,
    SymbolKind,
    LocationLink,
    Position,
} from 'vscode-languageserver'
import type { TextDocument } from 'vscode-languageserver-textdocument'
import path from 'path'

export function removeCachedSchema(uri: string) {
    remove_cached_schema(uri)
}

export function validateTextDocument(
    document: TextDocument,
    documents: TextDocument[],
): Diagnostic[] {
    const unsavedFiles: {[key: string]: string} = {};
    documents.map((document) => {
        unsavedFiles[document.uri.replace('file://', '')] = document.getText()
    })
    const sanitizedUri = document.uri.replace('file://', '')
    const linterStringResult = lint(sanitizedUri, unsavedFiles)
    const linterResult: TeoParserDiagnosticsItem[] = JSON.parse(linterStringResult)
    return linterResult.filter((result) => {
        return result.source == sanitizedUri
    }).map((result) => {
        return Diagnostic.create(
            Range.create(
                Position.create(result.span.start_position[0] - 1, result.span.start_position[1] - 1),
                Position.create(result.span.end_position[0] - 1, result.span.end_position[1] - 1),
            ),
            result.message,
            result.type == "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
        )
    })
}

type TeoParserDiagnosticsItem = {
    type: "error" | "warning"
    source: string
    message: string
    span: TeoParserDiagnosticsItemSpan
}

type TeoParserDiagnosticsItemSpan = {
    start: number
    end: number
    start_position: [number, number]
    end_position: [number, number]
}

type TeoDefinition = {
    path: string
    selection_span: TeoSpan
    target_span: TeoSpan
    identifier_span: TeoSpan
}

type TeoSpan = {
    start: number
    end: number
    start_position: number[]
    end_position: number[]
}

type TeoCompletionItem = {
    label: string
    namespace_path?: string
    documentation?: string
    detail?: string
}

export function findDefinitionsAtPosition(uri: string, position: Position): LocationLink[] {
    const sanitizedUri = uri.replace('file://', '')
    const results: TeoDefinition[] = find_definitions(sanitizedUri, [position.line + 1, position.character + 1])
    return results.map((result) => {
        return LocationLink.create(
            result.path === "(builtin)std.teo" ? path.join(__dirname, "../dumps/builtin/std.teo") : result.path,  
            Range.create(
                Position.create(result.target_span.start_position[0] - 1, result.target_span.start_position[1] - 1),
                Position.create(result.target_span.end_position[0] - 1, result.target_span.end_position[1] - 1)
            ),
            Range.create(
                Position.create(result.identifier_span.start_position[0] - 1, result.identifier_span.start_position[1] - 1),
                Position.create(result.identifier_span.end_position[0] - 1, result.identifier_span.end_position[1] - 1)
            ),
            Range.create(
                Position.create(result.selection_span.start_position[0] - 1, result.selection_span.start_position[1] - 1),
                Position.create(result.selection_span.end_position[0] - 1, result.selection_span.end_position[1] - 1)
            )
        )
    })
}

export function completionItemsAtPosition(uri: string, position: Position, documents: TextDocument[]): CompletionItem[] {
    const unsavedFiles: {[key: string]: string} = {};
    documents.map((document) => {
        unsavedFiles[document.uri.replace('file://', '')] = document.getText()
    })
    const sanitizedUri = uri.replace('file://', '')
    const results: TeoCompletionItem[] = completion_items(sanitizedUri, [position.line + 1, position.character + 1], unsavedFiles)
    return results.map((result) => {
        let item = CompletionItem.create(
            result.label
        )
        item.documentation = result.documentation
        item.detail = result.detail
        item.labelDetails = {
            description: result.namespace_path,
        }
        return item
    })
}

export function formatDocument(uri: string, documents: TextDocument[]): string {
    const unsavedFiles: {[key: string]: string} = {};
    documents.map((document) => {
        unsavedFiles[document.uri.replace('file://', '')] = document.getText()
    })
    const sanitizedUri = uri.replace('file://', '')
    const result = format_document(sanitizedUri, unsavedFiles)
    return result
}