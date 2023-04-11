export interface VariableInfo {
	name: string;
	href: string;
}
export interface TocItem {
	name: string;
	href: string;
	items?: TocItem[];
}
export interface TocData {
	items: TocItem[];
}
export interface CategoryData {
	items: {
		uid: string;
		commentId: string;
		id: string;
		langs: string[];
		children: string[];
		name: string;
		nameWithType: string;
		fullName: string;
		type: string;
		references: {
			uid: string;
			commentId: string;
			isExternal: boolean;
			name: string;
			nameWithType: string;
			fullName: string;
		}[];
	}[];
}
export interface ChildData {
	items: {
		uid: string;
		commentId: string;
		id: string;
		langs: string[];
		children: string[];
		name: string;
		nameWithType: string;
		fullName: string;
		type: string;
		summary: string;
		syntax?: {
			content: string;
		};
		example?: string;
		["so.intellisense"]?: string;
		parent?: string;
	}[];
}
export interface MyCompletionItemData {
	filename: string;
	exampleCode: string;
  }

  export interface YmlRoot {
	items: YmlItem[];
	references: YmlReference[];
}

export interface YmlItem {
	uid: string;
	commentId: string;
	id: string;
	langs: string[];
	children: string[];
	parent: string;
	name: string;
	nameWithType: string;
	fullName: string;
	type: string;
	summary: string;
	example?: string[] | null;
}

export interface YmlReference {
	uid: string;
	commentId: string;
	isExternal: boolean;
	name: string;
	nameWithType: string;
	fullName: string;
}

export interface TocRoot {
	items: TocRootItem[];
}

export interface TocRootItem {
	name: string;
	href: string;
	items?: TocRootItem[];
}

