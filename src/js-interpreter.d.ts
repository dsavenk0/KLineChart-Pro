declare module 'js-interpreter' {
    class Interpreter {
        constructor(code: string, initFunc?: (interpreter: Interpreter, globalObject: any) => void);
        appendCode(code: string): void;
        run(): boolean;
        step(): boolean;
        value: any;
        pseudoToNative(pseudoObj: any): any;
        nativeToPseudo(nativeObj: any): any;
        setProperty(obj: any, name: string, value: any): void;
        createNativeFunction(nativeFunc: Function): any;
    }
    export default Interpreter;
}
