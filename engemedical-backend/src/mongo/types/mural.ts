import { ObjectId } from 'mongodb';

export interface MuralStyles {
  BACKGROUNDCOLOR?: string;
  TEXTCOLOR?: string;
  BODYTEXTCOLOR?: string;
  FONTFAMILY?: string;
  VIDEOMUTED?: boolean;
}

export interface MuralDocument {
  _id?: ObjectId | string;
  LAYOUTTYPE: 'TEXT_WITH_IMAGE' | 'FULL_IMAGE' | 'VIDEO';
  TITLE?: string;
  BODYTEXT?: string;
  IMAGEURL?: string;
  STYLES: MuralStyles;
  CREATEDBY?: string;
  ACTIVE: boolean;
  CREATEDAT: Date;
  UPDATEDAT: Date;
}
