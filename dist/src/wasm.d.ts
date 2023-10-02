import { Diagnostic } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
export declare function handleDiagnosticsRequest(document: TextDocument): Diagnostic[];
