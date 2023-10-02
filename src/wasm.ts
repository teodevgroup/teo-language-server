import { lint } from 'teo-language-server-wasm'
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

export function validateTextDocument(
    document: TextDocument,
): Diagnostic[] {
    const sanitizedUri = document.uri.replace('file://', '')
    const linterStringResult = lint(sanitizedUri)
    const linterResult: TeoParserDiagnosticsItem[] = JSON.parse(linterStringResult)
    return linterResult.filter((result) => {
        return result.source == sanitizedUri
    }).map((result) => {
        return Diagnostic.create(
            Range.create(
                Position.create(result.span.start_position[0] - 1, result.span.start_position[1] - 1),
                Position.create(result.span.end_position[0] - 1, result.span.end_position[1] - 1),
            ),
            result.message
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
