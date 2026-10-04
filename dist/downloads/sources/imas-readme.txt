Description of the different files


CapacityCountryLevel_Detailed.csv:		The fishing capacity and effort data 1950-2017, by country, gear, with error, containing the following elements:
Year: 			The year of the fishing effort event
SAUP:			Fishing Country Code. Conversion file attached ("SAUPtoCountry.csv")
Country:		Fishing Country (in ISO3 format)
NV:			Total number of vessels
P:			Total engine power of the vessels (kW)
GT:			Total gross tonnage of the vessels (gross tonnes)
NV Active:		Number of active vessels
PActive:		Engine power of the active vessels (kW)
GTActive:		Gross tonnage of the active vessels (gross tonnes)
NomActive:		Nominal fishing effort, in kW x days at sea. Only active vessels considered
EffActive:		Effective fishing effort, in kW x days at sea. It assumes a 3.5% variable technological creep, with 1949 as comparison value.
NVerr: 			Error (in ratio to the total number of vessels) on the number of vessels
Perr: 			Error (in ratio to the total engine power) on the engine power per vessel
GTerr: 			Error (in ratio to the total gross tonnage) on the tonnage per vessel
Length_Category:	Length of the fishing vessels (less than 6, 6-12m, 12-24m, 24-50m, over 50m)	
Gear:			Gear used in fishing
Region:			Sociocultural region of the country used in calculations

                         
Each other file may contain some of the following elements:
UNTITLED (if present): 	row number. Can be removed
SAUP:			Fishing Country Code. Conversion file attached ("SAUPtoCountry.csv")
Country:		Fishing Country (in ISO3 format)
Lat:			Latitude of the centre of 0.5 degree cell in which fishing takes place
Lon:			Longitudeof the centre of 0.5 degree cell in which fishing takes place
Gear:			Gear used in fishing
FGroup:			Functional Ggroup of species targetted
Length_Category:	Length of the fishing vessels (less than 6, 6-12m, 12-24m, 24-50m, over 50m)	
Sector:			Fishing Sector. Can be APW (Artisanal powered), UP ( artisanal unpowered), or I (industrial).
NomActive:		Nominal fishing effort, in kW x days at sea. Conversion to fishing hours by cell and length of boat given in "ConversionFishingHours.csv"
EffActive:		Effective fishing effort, in kW x days at sea. It assumes a 3.5% variable technological creep, with 1949 as comparison value.
NomActiveHours:		Nominal fishing effort, in kW x fishing hours.	
EffActiveHours:		Effective fishing effort, in kW x fishing hours. It assumes a 3.5% variable technological creep, with 1949 as comparison value.
NV:			Number of vessels active in the event
P:			Total engine power of the vessels (kW) active in the event 
GT:			Total gross tonnage of the vessels (gross tonnes) active in the event
Year: 			The year of the fishing effort event

Specific for conversion files:
LME:			Code for the large Marine ecosystem. Can be converted to name with the file "NamesLME_EEZ.csv". Each LME / EEZ can be converted to the cells (latitude/longitude) in the files "CellstoLME_EEZ"
EEZ:			Code for the EEZ. Can be converted to name with the file "NamesLME_EEZ.csv". Each LME / EEZ can be converted to the cells (latitude/longitude) in the files "CellstoLME_EEZ"
Area:			Area of the cell, in km2
DAStoFH:		Conversion factor for a Day at sea to fishing hours (in hours per day)
min			Min observed number of fishing hours per day at sea
mean			Average observed number of fishing hours per day at sea
max			Max observed number of fishing hours per day at sea




## Folder "effort_mapped"
Contains yearly tables for the gridded (0.5 deg cell) effort. Years are NOT included in files due to size, but in filenames
Filenames as follow: mapped_YEAR_S.csv
S can be APW, UP, or I, and refers to the fishing sector (Artisanal powered, artisanal unpowered, industrial).
Each row is one fishing effort event (effort by fishing country, vessel length category, gear type, functional group targetted, year and sector)
The effort is in kW x days at sea, can be converted to fishing hours using "ConversionFishingHours.csv"

## Folder "effort_mapped_country"
Contains country tables for the gridded (0.5 deg cell) effort. Years span 1950-2017, as appropriate.
Filenames as follow: mapped_SAUP.csv
SAUP is the Fishing Country Code. Conversion file attached (SAUPtoCountry.csv).
Each row is one fishing effort event (effort by fishing country, vessel length category, gear type, functional group targetted, year and sector)
The effort is in kW x days at sea, can be converted to fishing hours using "ConversionFishingHours.csv"

## aggregated files:
# Gridded files
GriddedEffortby_FGroup_FishingCountry_Sector.csv: 	aggregation of the effort (including fishing hours) by functional group, fishing country, sector, year and cell (latitude/longitude). 
GriddedEffortby_FishingCountry.csv: 			aggregation of the effort (including fishing hours) by fishing country, year and cell (latitude/longitude). 
GriddedEffortby_Fgroup.csv: 				aggregation of the effort (including fishing hours) by functional group, year and cell (latitude/longitude). 

# Total Files (no Grid)
TotalEffortby_FGroup_FishingCountry_Sector.csv:			aggregation of the effort (including fishing hours) by functional group, fishing country, sector and year 	
TotalEffortby_FGroup_LME_Sector.csv:				aggregation of the effort (including fishing hours) by functional group, sector, year and Large Marine Ecosystem
TotalEffortby_FGroup_EEZ_Sector.csv:				aggregation of the effort (including fishing hours) by functional group, sector, year and EEZ
TotalEffortby_FishingCountry_LengthBoat_Gear_Sector.csv: 	aggregation of the effort (including fishing hours) by fishing country, sector, gear, length category and year 
TotalEffortby_FGroup_FishingCountry_LengthBoat_Sector.csv:	aggregation of the effort (including fishing hours) by fishing country, sector, functional group, length category and year 

# Conversion files
ConversionFishingHours.csv: 	Conversion factors for the number of day at sea to fishing hours, per cell (latitude / longitude)
SAUPtoCountry.csv: 		Conversion SAUP code to fishing country (ISO3)
CellstoLME_EEZ:			Large Marine Ecosystem and EEZ for each cel (latitude / longitude)

