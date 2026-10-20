import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsOnOrAfter } from '../../../common/validation/is-on-or-after.decorator.js';
import { Trim } from '../../../common/validation/trim.decorator.js';
import type { ParentRelationship } from '../models/child.model.js';

const PARENT_RELATIONSHIPS: ParentRelationship[] = [
  'mother',
  'father',
  'guardian',
  'other',
];

/** Digits, spaces and + ( ) . - only, e.g. "06 12 34 56 78" or "+33 6 12 34 56 78". */
const PHONE_PATTERN = /^\+?[0-9 ().-]{6,30}$/;
const PHONE_MESSAGE =
  'Le numéro de téléphone ne peut contenir que des chiffres, des espaces et + ( ) . -.';

export class SaveParentDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  /** Identifies the parent: siblings share the same parent record. */
  @Trim()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @Trim()
  @Matches(PHONE_PATTERN, { message: PHONE_MESSAGE })
  phone: string;

  @IsIn(PARENT_RELATIONSHIPS)
  relationship: ParentRelationship;
}

export class SaveContactDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  relationship: string;

  @Trim()
  @Matches(PHONE_PATTERN, { message: PHONE_MESSAGE })
  phone: string;
}

/** Body of `POST /children` and `PUT /children/:id`. */
export class SaveChildDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsDateString({ strict: true })
  birthDate: string;

  @IsDateString({ strict: true })
  @IsOnOrAfter('birthDate', {
    message: "La date d'inscription ne peut pas précéder la naissance.",
  })
  enrollmentStart: string;

  /** Null while the end of the enrollment is not known. */
  @IsOptional()
  @IsDateString({ strict: true })
  @IsOnOrAfter('enrollmentStart', {
    message: "La fin d'inscription doit suivre le début.",
  })
  enrollmentEnd: string | null;

  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins un parent responsable est requis.' })
  @ArrayMaxSize(4)
  @ArrayUnique((parent: SaveParentDto) => parent.email?.toLowerCase(), {
    message: 'Chaque parent doit avoir une adresse e-mail différente.',
  })
  @ValidateNested({ each: true })
  @Type(() => SaveParentDto)
  parents: SaveParentDto[];

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SaveContactDto)
  contacts: SaveContactDto[];
}
