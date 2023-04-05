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

