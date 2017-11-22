import { attr } from "../../../func/node";
import { type } from "../../../func/util";
import { directiveErr } from "../../../error";
import event from "../../../event/core";

export default {
	
	name : "model",

    /**
        before ()
    
        Return Type:
        void
    
        Description:
        更新视图前调用（即update方法调用前调用）
        此方法只会在初始化挂载数据时调用一次
    
        URL doc:
        http://icejs.org/######
    */
	before () {
        const 
            elem = this.node,
            nodeName = elem.nodeName,
            inputType = ( elem.attr ( "type" ) || "" ).toLowerCase (),
            expr = this.expr,
            vm = this.tmpl.getViewModel (),
            modelArray = vm [ expr ];
        if ( !/INPUT|TEXTAREA|SELECT/.test ( nodeName ) ) {
            throw directiveErr ( "model", "这个指令只能在包括'<input>'、'<textarea>'、'<select>'在内的表单元素上使用" );
        }

        if ( nodeName === "INPUT" && inputType === "checkbox" && type ( modelArray ) !== "array" ) {
            throw directiveErr ( "model", "checkbox表单元素只能绑定一个array类型的变量" );
        }

        const 
        	support = {
                input : {
                    nodeName : "TEXTAREA",
                    type : "text, password, color, search, week, date, datetime-local, month, time, email, range, tel, url"
                },
                change : {
                    nodeName : "SELECT",
                    inputType : "radio, checkbox"
                }
            },

            // 如果是复选框则数据要以数组的形式表现
            handler = nodeName === "INPUT" && inputType === "checkbox" ? function () {

                // 兼容处理，当数组中没有时才加入此数据
                // 因为当node.checked = false时是不触发此事件的
                // 如果不判断则可能导致重复的数据
                if ( this.checked && modelArray.indexOf ( this.value ) === -1 ) {
                    modelArray.push ( this.value );
                }
                else if ( !this.checked ) {
                    const i = modelArray.indexOf ( this.value );
                    if ( i >= 0 ) {
                        modelArray.splice ( i, 1 );
                    }
                }

                // 同步虚拟dom的值
                elem.attr ( "checked", this.checked );
            } : 
            function () {
                vm [ expr ] = this.value;

                // 同步虚拟dom的值
                elem.attr ( "value", this.value );
            };
    	

        // 判断支持input事件的元素名称或对应type的input元素
        if ( ( nodeName === "INPUT" && support.input.type.indexOf ( inputType ) !== -1 ) || support.input.nodeName.indexOf ( nodeName ) !== -1 ) {
            elem.bindEvent ( "input", handler );
        }
        else if ( ( nodeName === "INPUT" && support.change.inputType.indexOf ( inputType ) !== -1 ) || support.change.nodeName.indexOf ( nodeName ) !== -1 ) {

        	// 将相同model的radio控件分为一组
        	if ( inputType === "radio" ) {
            	elem.attr ( "name", expr );
            }
          
            elem.bindEvent ( "change", handler );
        }
    },

    /**
        update ( val: String )
    
        Return Type:
        void
    
        Description:
        表单元素双向绑定方法
    
        URL doc:
        http://icejs.org/######
    */
	update ( val ) {
    	const
        	tval = type ( val ),
            elem = this.node,
        	nodeName = elem.nodeName,
            inputType = ( elem.attr ( "type" ) || "" ).toLowerCase ();

		// 对radio的处理
    	if ( tval === "string" && nodeName === "INPUT" && inputType === "radio" ) {
        	if ( elem.attr ( "value" ) === val ) {
                elem.attr ( "checked", true );
            }
            else {
                elem.attr ( "checked", false );
            }
        }
    	
    	// 对checkbox的处理
    	else if ( tval === "array" && nodeName === "INPUT" && inputType === "checkbox" ) {
        	if ( val.indexOf ( elem.attr ( "value" ) ) !== -1 ) {
            	elem.attr ( "checked", true );
            }
        	else {
            	elem.attr ( "checked", false );
            }
        }
    	
    	// 其他控件的处理
    	else {
        	elem.attr ( "value", val );
        }
    }
};